import { useMemo } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import type { RatingPillar } from "../../lib/deckIdentity";
import { useComparisonData } from "./useComparisonData";
import type { ComparedDeck } from "./types";

type Section = "main" | "material" | "sideboard";

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

    // name -> where/how many copies it sits, per deck position — built once from the shared
    // section grouping so a card's placement can't disagree between this and the Table view.
    const placementsByDeck: Map<string, { section: Section; qty: number }>[] = decks.map(() => new Map());
    for (const section of sections) {
      for (const group of section.groups) {
        for (const card of group.cards) {
          card.quantities.forEach((qty, i) => {
            if (qty > 0) placementsByDeck[i].set(card.name, { section: section.key as Section, qty });
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
        const b = baselinePlacements.get(name);
        const t = targetPlacements.get(name);
        if (b && t) {
          sharedCardCount++;
          const sectionChanged = b.section !== t.section;
          const qtyChanged = b.qty !== t.qty;
          if (sectionChanged || qtyChanged) {
            changes.push({
              name,
              kind: sectionChanged && qtyChanged ? "movedQuantity" : sectionChanged ? "moved" : "quantity",
              baselineQty: b.qty,
              targetQty: t.qty,
              baselineSection: b.section,
              targetSection: t.section,
            });
          }
        } else if (t && !b) {
          changes.push({ name, kind: "added", baselineQty: 0, targetQty: t.qty, baselineSection: null, targetSection: t.section });
        } else if (b && !t) {
          changes.push({ name, kind: "removed", baselineQty: b.qty, targetQty: 0, baselineSection: b.section, targetSection: null });
        }
      }

      changes.sort((a, b2) => a.name.localeCompare(b2.name));

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
