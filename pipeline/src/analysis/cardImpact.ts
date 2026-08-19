import {
  computeCardImpactEntries,
  decodeCardLines,
  type ArchetypeCluster,
  type CardImpactData,
  type CardSectionRow,
  type ClusterCardImpact,
  type DeckCardIndexEntry,
  type DeckSections,
  type DeckSighting,
} from "@gatcg/shared";
import { config } from "../config.js";

/** All three sections kept separate — a champion/relic that only ever appears in the material deck was previously getting mislabeled `role: "main"` when main and material were collapsed into one set. */
function decodeDeckSections(entry: DeckCardIndexEntry, cardNames: string[]): DeckSections {
  return {
    main: new Set(decodeCardLines(entry.main, cardNames).map((l) => l.name)),
    material: new Set(decodeCardLines(entry.material, cardNames).map((l) => l.name)),
    sideboard: new Set(decodeCardLines(entry.sideboard, cardNames).map((l) => l.name)),
  };
}

/**
 * For each named build (archetype cluster), does having a given card (in any section) correlate
 * with a higher win rate than not having it? Answers two asks at once: "does sideboard tech
 * actually matter" (filter the result by `role: "sideboard"`) and "what could improve this
 * decklist" (any card not already in a viewed decklist, with positive `adjustedLift`, for the
 * cluster it belongs to — resolved via `deckClusterIndex`).
 *
 * Correlational, not causal — a card being associated with a higher win rate doesn't mean playing
 * it *causes* that outcome; strong players may simply choose good cards more often. Every UI
 * surface for this data carries the same caveat. See docs/CALCULATIONS.md.
 */
export function computeCardImpact(
  clusters: ArchetypeCluster[],
  deckCardIndex: { cardNames: string[]; entries: DeckCardIndexEntry[] },
  deckSightings: DeckSighting[],
): CardImpactData {
  const winRateByDeckId = new Map(deckSightings.map((s) => [s.deckId, s.winRate]));
  const sectionsByDeckId = new Map<string, DeckSections>();
  for (const entry of deckCardIndex.entries) {
    sectionsByDeckId.set(entry.deckId, decodeDeckSections(entry, deckCardIndex.cardNames));
  }

  const prior = config.winRateShrinkagePriorWeight;
  const minSample = config.cardImpactMinSampleSize;

  const clusterImpacts: ClusterCardImpact[] = [];
  const deckClusterIndex: Record<string, string> = {};

  for (const cluster of clusters) {
    for (const deckId of cluster.deckIds) deckClusterIndex[deckId] = cluster.id;

    const memberDeckIds = cluster.deckIds.filter((id) => sectionsByDeckId.has(id) && winRateByDeckId.has(id));
    if (memberDeckIds.length === 0) continue;

    // Shrink each side toward the cluster's OWN average win rate, not a flat 50% — a build can
    // sit well off 50% due to Swiss/tournament dynamics, so its own baseline is a more honest
    // prior than cardStats.ts's flat-0.5 version of this same Bayesian-average shape.
    const rows: CardSectionRow[] = memberDeckIds.map((id) => ({
      sections: sectionsByDeckId.get(id)!,
      outcome: winRateByDeckId.get(id)!,
    }));
    const entries = computeCardImpactEntries(rows, cluster.avgWinRate, prior, minSample);

    clusterImpacts.push({
      clusterId: cluster.id,
      championName: cluster.championName,
      clusterName: cluster.name,
      totalDecks: memberDeckIds.length,
      baselineWinRate: cluster.avgWinRate,
      cards: entries.slice(0, 30),
    });
  }

  return { generatedAt: new Date().toISOString(), clusters: clusterImpacts, deckClusterIndex };
}
