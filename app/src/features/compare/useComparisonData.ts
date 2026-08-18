import { useMemo } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
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

export interface ComparisonSection {
  key: keyof OmnidexDecklist;
  label: string;
  cards: ComparisonCardEntry[];
}

export interface ComparisonDeckStats {
  key: string;
  price: number;
  championName: string | null;
  classes: string[];
  elements: string[];
  rating: DeckRating | null;
}

/**
 * Single source of truth for the compare set's derived data — card-by-card presence/core/unique
 * flags and per-deck stats (price, identity, power rating) — shared by both the table (`ComparisonGrid`)
 * and stacked-card (`ComparisonCards`) views so they can't drift from each other.
 */
export function useComparisonData(decks: ComparedDeck[], decklists: Map<string, OmnidexDecklist | null>) {
  const priceByName = useDeckPriceByName();

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
        const list = decklists.get(d.key);
        if (!list) return { key: d.key, price: 0, championName: null, classes: [], elements: [], rating: null };

        const price = computeSectionPrice([...list.main, ...list.material, ...list.sideboard], priceByName).total;
        const mainMaterialLines = [...list.main, ...list.material].map((l) => ({ name: l.card, quantity: l.quantity }));
        const identity = computeDeckIdentity(mainMaterialLines, cardsByName);
        const championName = findDeckChampionName(list.material, cardsByName);
        const rating =
          mainMaterialLines.length > 0 ? computeDeckRating(mainMaterialLines, cardsByName, championName, identity.classes) : null;

        return { key: d.key, price, championName, classes: identity.classes, elements: identity.elements, rating };
      }),
    [decks, decklists, cardsByName, priceByName],
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
        return { key: sectionKey, label, cards };
      }),
    [decks, decklists, resolvedCount],
  );

  return { cardsByName, resolvedCount, deckStats, sections };
}
