import { useMemo } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import type { RatingPillar } from "../../lib/deckIdentity";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";

type Section = "main" | "material" | "sideboard";
const SECTION_KEYS: Section[] = ["main", "material", "sideboard"];

export type ComparisonChangeKind = "added" | "removed" | "moved" | "quantity" | "movedQuantity";

export interface ComparisonCardChange {
  name: string;
  kind: ComparisonChangeKind;
  baselineQty: number;
  targetQty: number;
  baselineSection: Section | null;
  targetSection: Section | null;
}

export interface ComparisonDeckSummary {
  key: string;
  label: string;
  /** True while this deck's own decklist (or the baseline's) hasn't resolved yet — render a loading state, not a diff. */
  loading: boolean;
  /** True once resolved, if either this deck or the baseline turned out to have no decklist at all. */
  unavailable: boolean;
  sharedCardCount: number;
  changes: ComparisonCardChange[];
  priceDelta: number | null;
  winRateDelta: number | null;
  compositeDelta: number | null;
  pillarDeltas: Record<RatingPillar, number> | null;
  baselineChampion: string | null;
  targetChampion: string | null;
  championChanged: boolean;
  baselineSpirit: string | null;
  targetSpirit: string | null;
  spiritChanged: boolean;
}

/** A Spirit is just a material CHAMPION card with the SPIRIT subtype — same detection rule `deckBuilderParamsFromDecklist` and the Guided Deck Builder's paste-import use. */
function findSpiritName(decklist: OmnidexDecklist | null | undefined, cardsByName: Map<string, Card>): string | null {
  if (!decklist) return null;
  for (const line of decklist.material) {
    const card = cardsByName.get(line.card);
    if (card?.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")) return card.name;
  }
  return null;
}

/**
 * Every other compared deck's card-level and stat-level delta against one chosen baseline deck —
 * the data behind Compare's Summary view (see ComparisonSummary.tsx). Built on top of
 * `useComparisonData` (same price/rating/identity/section-grouping every other Compare view uses)
 * rather than recomputing any of that, so this can't drift from the Table/Cards views.
 */
export function useComparisonSummary(
  decks: ComparedDeck[],
  decklists: Map<string, OmnidexDecklist | null>,
  baselineKey: string | null,
): { baselineIndex: number; summaries: ComparisonDeckSummary[]; cardsByName: Map<string, Card> } {
  const { cardsByName, deckStats, sections } = useComparisonData(decks, decklists);

  const { baselineIndex, summaries } = useMemo(() => {
    const baselineIndex = baselineKey ? decks.findIndex((d) => d.key === baselineKey) : -1;
    if (baselineIndex === -1) return { baselineIndex: -1, summaries: [] as ComparisonDeckSummary[] };

    const baselineDeck = decks[baselineIndex];
    const baselineStats = deckStats[baselineIndex];
    const baselineListLoaded = decklists.has(baselineDeck.key);
    const baselineList = decklists.get(baselineDeck.key);
    const baselineSpirit = findSpiritName(baselineList, cardsByName);

    // name -> per-section copy counts, per deck position — built once from the shared section
    // grouping so a card's placement can't disagree between this and the Table view. Keyed by
    // section (not just card name): a card can legally sit in more than one section at once (e.g.
    // Main and Sideboard both running their own copies of the same card), and collapsing that to a
    // single {section, qty} would silently drop whichever section got visited last.
    const placementsByDeck: Map<string, Map<Section, number>>[] = decks.map(() => new Map());
    for (const section of sections) {
      for (const group of section.groups) {
        for (const card of group.cards) {
          card.quantities.forEach((qty, i) => {
            if (qty === 0) return;
            const byCard = placementsByDeck[i].get(card.name) ?? new Map<Section, number>();
            byCard.set(section.key as Section, qty);
            placementsByDeck[i].set(card.name, byCard);
          });
        }
      }
    }
    const baselinePlacements = placementsByDeck[baselineIndex];

    const summaries: ComparisonDeckSummary[] = decks.map((d, i) => {
      if (i === baselineIndex) {
        return {
          key: d.key,
          label: d.label,
          loading: false,
          unavailable: false,
          sharedCardCount: baselinePlacements.size,
          changes: [],
          priceDelta: 0,
          winRateDelta: 0,
          compositeDelta: 0,
          pillarDeltas: { aggro: 0, consistency: 0, interaction: 0, resilience: 0 },
          baselineChampion: baselineStats.championName,
          targetChampion: baselineStats.championName,
          championChanged: false,
          baselineSpirit,
          targetSpirit: baselineSpirit,
          spiritChanged: false,
        };
      }

      const targetListLoaded = decklists.has(d.key);
      const loading = !baselineListLoaded || !targetListLoaded;
      const targetList = decklists.get(d.key);
      const unavailable = !loading && (!baselineList || !targetList);

      if (loading || unavailable) {
        return {
          key: d.key,
          label: d.label,
          loading,
          unavailable,
          sharedCardCount: 0,
          changes: [],
          priceDelta: null,
          winRateDelta: null,
          compositeDelta: null,
          pillarDeltas: null,
          baselineChampion: baselineStats.championName,
          targetChampion: null,
          championChanged: false,
          baselineSpirit,
          targetSpirit: null,
          spiritChanged: false,
        };
      }

      const targetStats = deckStats[i];
      const targetPlacements = placementsByDeck[i];
      const targetSpirit = findSpiritName(targetList, cardsByName);

      const allNames = new Set([...baselinePlacements.keys(), ...targetPlacements.keys()]);
      const changes: ComparisonCardChange[] = [];
      let sharedCardCount = 0;

      for (const name of allNames) {
        const bSections = baselinePlacements.get(name);
        const tSections = targetPlacements.get(name);
        if (bSections && tSections) sharedCardCount++;

        // Per-section deltas first — a card can sit in more than one section at once, so every
        // section needs its own before/after comparison rather than picking just one.
        const deltas = SECTION_KEYS.map((section) => ({
          section,
          baselineQty: bSections?.get(section) ?? 0,
          targetQty: tSections?.get(section) ?? 0,
        })).filter((d) => d.baselineQty !== d.targetQty);
        if (deltas.length === 0) continue;

        // Only call it a "move" for the clean two-section case — one section's copies zeroed out
        // exactly as another section's appeared — so a card with independent changes across 2+
        // sections (or a partial shift alongside an unrelated quantity change) isn't mislabeled.
        if (deltas.length === 2) {
          const [d1, d2] = deltas;
          const from = d1.baselineQty > 0 && d1.targetQty === 0 ? d1 : d2.baselineQty > 0 && d2.targetQty === 0 ? d2 : null;
          const to = from === d1 ? d2 : d1;
          if (from && to.baselineQty === 0 && to.targetQty > 0) {
            changes.push({
              name,
              kind: from.baselineQty === to.targetQty ? "moved" : "movedQuantity",
              baselineQty: from.baselineQty,
              targetQty: to.targetQty,
              baselineSection: from.section,
              targetSection: to.section,
            });
            continue;
          }
        }

        for (const d of deltas) {
          const kind: ComparisonChangeKind = d.baselineQty === 0 ? "added" : d.targetQty === 0 ? "removed" : "quantity";
          changes.push({
            name,
            kind,
            baselineQty: d.baselineQty,
            targetQty: d.targetQty,
            baselineSection: d.baselineQty === 0 ? null : d.section,
            targetSection: d.targetQty === 0 ? null : d.section,
          });
        }
      }

      changes.sort((a, b2) => a.name.localeCompare(b2.name) || (a.baselineSection ?? a.targetSection ?? "").localeCompare(b2.baselineSection ?? b2.targetSection ?? ""));

      const priceDelta = baselineStats.price > 0 && targetStats.price > 0 ? targetStats.price - baselineStats.price : null;
      const winRateDelta =
        baselineStats.winRate !== null && targetStats.winRate !== null ? targetStats.winRate - baselineStats.winRate : null;
      const compositeDelta =
        baselineStats.rating && targetStats.rating ? +(targetStats.rating.composite - baselineStats.rating.composite).toFixed(2) : null;
      const pillarDeltas: Record<RatingPillar, number> | null =
        baselineStats.rating && targetStats.rating
          ? {
              aggro: targetStats.rating.scores.aggro - baselineStats.rating.scores.aggro,
              consistency: targetStats.rating.scores.consistency - baselineStats.rating.scores.consistency,
              interaction: targetStats.rating.scores.interaction - baselineStats.rating.scores.interaction,
              resilience: targetStats.rating.scores.resilience - baselineStats.rating.scores.resilience,
            }
          : null;

      return {
        key: d.key,
        label: d.label,
        loading: false,
        unavailable: false,
        sharedCardCount,
        changes,
        priceDelta,
        winRateDelta,
        compositeDelta,
        pillarDeltas,
        baselineChampion: baselineStats.championName,
        targetChampion: targetStats.championName,
        championChanged: baselineStats.championName !== targetStats.championName,
        baselineSpirit,
        targetSpirit,
        spiritChanged: baselineSpirit !== targetSpirit,
      };
    });

    return { baselineIndex, summaries };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks, decklists, cardsByName, deckStats, sections, baselineKey]);

  return { baselineIndex, summaries, cardsByName };
}
