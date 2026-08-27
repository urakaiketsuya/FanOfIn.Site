import { useMemo } from "react";
import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { computeSectionPrice } from "../../lib/deckPrice";
import { computeDeckIdentity, computeDeckRating, type DeckRating } from "../../lib/deckIdentity";
import { findDeckChampionName } from "../../lib/ttsExport";
import type { ComparedDeck } from "./types";

const SECTIONS: { key: keyof OmnidexDecklist; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "material", label: "Material" },
  { key: "sideboard", label: "Sideboard" },
];

export interface ComparisonCardEntry {
  name: string;
  quantities: number[]; // one per deck, 0 if absent
  isCore: boolean;
  isUnique: boolean;
}

/** Cards sharing the exact same presence pattern across the compared decks — see `groupCardsByMatch`. */
export interface ComparisonCardGroup {
  label: string;
  /** Indices into the compare set's `decks` array that this group's cards are present in. */
  deckIndices: number[];
  cards: ComparisonCardEntry[];
}

export interface ComparisonSection {
  key: keyof OmnidexDecklist;
  label: string;
  groups: ComparisonCardGroup[];
}

function buildGroupLabel(deckIndices: number[], decks: ComparedDeck[]): string {
  if (deckIndices.length === decks.length) return "In every deck";
  if (deckIndices.length === 1) return `Only in ${decks[deckIndices[0]].label}`;
  return `In ${deckIndices.map((i) => decks[i].label).join(" & ")}`;
}

/**
 * Clusters a section's cards by which exact subset of decks they're present in — "matching" cards
 * (shared by every compared deck) first, then smaller partial matches, then each deck's own
 * unique cards last (grouped by deck, in compare-set order). With only 2 decks compared (the
 * common case) this collapses to just "In every deck" + one "Only in X" group per deck; the
 * partial-match tier only shows up with 3+ decks where a card is shared by some but not all.
 */
function groupCardsByMatch(cards: ComparisonCardEntry[], decks: ComparedDeck[]): ComparisonCardGroup[] {
  if (decks.length <= 1) return cards.length > 0 ? [{ label: "", deckIndices: [], cards }] : [];

  const byPattern = new Map<string, ComparisonCardGroup>();
  for (const card of cards) {
    const deckIndices = card.quantities.flatMap((q, i) => (q > 0 ? [i] : []));
    const key = deckIndices.join(",");
    const group = byPattern.get(key) ?? { label: buildGroupLabel(deckIndices, decks), deckIndices, cards: [] };
    group.cards.push(card);
    byPattern.set(key, group);
  }

  return Array.from(byPattern.values()).sort((a, b) => {
    const aAll = a.deckIndices.length === decks.length;
    const bAll = b.deckIndices.length === decks.length;
    if (aAll !== bAll) return aAll ? -1 : 1;
    if (a.deckIndices.length !== b.deckIndices.length) return b.deckIndices.length - a.deckIndices.length;
    return (a.deckIndices[0] ?? 0) - (b.deckIndices[0] ?? 0);
  });
}

export interface ComparisonDeckStats {
  key: string;
  price: number;
  championName: string | null;
  classes: string[];
  elements: string[];
  rating: DeckRating | null;
  /** The real recorded outcome for a "sighting" deck (an actual event participant) — null for a "custom" (pasted) deck, since there's no tournament result to report. */
  winRate: number | null;
  format: DeckFormat;
}

function inferFormat(deck: ComparedDeck, list: OmnidexDecklist | null | undefined): DeckFormat {
  if (deck.format) return deck.format;
  if (deck.source.kind === "sighting") return "STANDARD";
  if (!list) return "UNKNOWN";
  const lines = [...list.main, ...list.material];
  return lines.length > 0 && lines.every((line) => line.quantity === 1) ? "PANTHEON" : "STANDARD";
}

/**
 * Single source of truth for the compare set's derived data — card-by-card presence/core/unique
 * flags and per-deck stats (price, identity, DIAO score) — shared by both the table (`ComparisonGrid`)
 * and stacked-card (`ComparisonCards`) views so they can't drift from each other.
 */
export function useComparisonData(decks: ComparedDeck[], decklists: Map<string, OmnidexDecklist | null>) {
  const priceByName = useDeckPriceByName();
  const popularityIndexData = useDeckPopularityIndexData();
  const winRateByDeckId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of popularityIndexData?.entries ?? []) map.set(entry.deckId, entry.winRate);
    return map;
  }, [popularityIndexData]);

  const allNames = useMemo(
    () =>
      Array.from(
        new Set(
          decks.flatMap((d) => {
            const list = decklists.get(d.key);
            if (!list) return [];
            return [...list.main, ...list.material, ...list.sideboard].map((l) => l.card);
          }),
        ),
      ),
    [decks, decklists],
  );
  const cardsByName = useCardsByNames(allNames);

  const resolvedCount = decks.filter((d) => decklists.get(d.key)).length;

  const deckStats: ComparisonDeckStats[] = useMemo(
    () =>
      decks.map((d) => {
        const winRate = d.source.kind === "sighting" ? (winRateByDeckId.get(d.key) ?? null) : null;
        const list = decklists.get(d.key);
        const format = inferFormat(d, list);
        if (!list) return { key: d.key, price: 0, championName: null, classes: [], elements: [], rating: null, winRate, format };

        const price = computeSectionPrice([...list.main, ...list.material, ...list.sideboard], priceByName).total;
        const mainMaterialLines = [...list.main, ...list.material].map((l) => ({ name: l.card, quantity: l.quantity }));
        const identity = computeDeckIdentity(mainMaterialLines, cardsByName);
        const championName = findDeckChampionName(list.material, cardsByName);
        const rating =
          mainMaterialLines.length > 0 ? computeDeckRating(mainMaterialLines, cardsByName, championName, identity.classes) : null;

        return { key: d.key, price, championName, classes: identity.classes, elements: identity.elements, rating, winRate, format };
      }),
    [decks, decklists, cardsByName, priceByName, winRateByDeckId],
  );

  const sections: ComparisonSection[] = useMemo(
    () =>
      SECTIONS.map(({ key: sectionKey, label }) => {
        const namesInSection = Array.from(
          new Set(
            decks.flatMap((d) => {
              const list = decklists.get(d.key);
              return list ? list[sectionKey].map((l) => l.card) : [];
            }),
          ),
        );
        const cards: ComparisonCardEntry[] = namesInSection.map((name) => {
          const quantities = decks.map((d) => {
            const list = decklists.get(d.key);
            const line = list?.[sectionKey].find((l) => l.card === name);
            return line?.quantity ?? 0;
          });
          const presentCount = quantities.filter((q) => q > 0).length;
          return {
            name,
            quantities,
            isCore: resolvedCount > 1 && presentCount === resolvedCount,
            isUnique: resolvedCount > 1 && presentCount === 1,
          };
        });
        return { key: sectionKey, label, groups: groupCardsByMatch(cards, decks) };
      }),
    [decks, decklists, resolvedCount],
  );

  return { cardsByName, resolvedCount, deckStats, sections };
}
