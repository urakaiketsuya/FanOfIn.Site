import {
  decodeCardLines,
  type ArchetypeCluster,
  type CardImpactData,
  type CardImpactEntry,
  type CardImpactRole,
  type ClusterCardImpact,
  type DeckCardIndexEntry,
  type DeckSighting,
} from "@gatcg/shared";
import { config } from "../config.js";

export interface DeckSections {
  main: Set<string>;
  material: Set<string>;
  sideboard: Set<string>;
}

/** All three sections kept separate — a champion/relic that only ever appears in the material deck was previously getting mislabeled `role: "main"` when main and material were collapsed into one set. */
function decodeDeckSections(entry: DeckCardIndexEntry, cardNames: string[]): DeckSections {
  return {
    main: new Set(decodeCardLines(entry.main, cardNames).map((l) => l.name)),
    material: new Set(decodeCardLines(entry.material, cardNames).map((l) => l.name)),
    sideboard: new Set(decodeCardLines(entry.sideboard, cardNames).map((l) => l.name)),
  };
}

export interface CardSectionRow {
  sections: DeckSections;
  /** 1 = win, 0.5 = tie, 0 = loss (or an event-aggregate win rate, for the general/non-matchup caller). */
  outcome: number;
}

/**
 * Core with/without/shrink/role computation, shared by general Card Impact (outcome = a deck's
 * event-aggregate win rate) and matchup-scoped Card Impact (outcome = a single pairing's result).
 * For each card name appearing in any row: split rows into "with"/"without" buckets, shrink each
 * bucket's average outcome toward `baseline` (not a flat 50%) using the standard Bayesian-average
 * shape, keep the card only if both buckets clear `minSample`, and classify its role from
 * whichever section accounts for >=80% of its "with" appearances.
 */
export function computeCardImpactEntries(rows: CardSectionRow[], baseline: number, prior: number, minSample: number): CardImpactEntry[] {
  const allCardNames = new Set<string>();
  for (const { sections } of rows) {
    for (const n of sections.main) allCardNames.add(n);
    for (const n of sections.material) allCardNames.add(n);
    for (const n of sections.sideboard) allCardNames.add(n);
  }

  const entries: CardImpactEntry[] = [];
  for (const cardName of allCardNames) {
    let withSum = 0;
    let withN = 0;
    let withoutSum = 0;
    let withoutN = 0;
    let mainCount = 0;
    let materialCount = 0;
    let sideboardCount = 0;

    for (const { sections, outcome } of rows) {
      const inMain = sections.main.has(cardName);
      const inMaterial = sections.material.has(cardName);
      const inSideboard = sections.sideboard.has(cardName);

      if (inMain || inMaterial || inSideboard) {
        withSum += outcome;
        withN++;
        if (inMain) mainCount++;
        if (inMaterial) materialCount++;
        if (inSideboard) sideboardCount++;
      } else {
        withoutSum += outcome;
        withoutN++;
      }
    }

    if (withN < minSample || withoutN < minSample) continue;

    const shrunkWith = (withSum + prior * baseline) / (withN + prior);
    const shrunkWithout = (withoutSum + prior * baseline) / (withoutN + prior);

    const sectionTotal = mainCount + materialCount + sideboardCount;
    const shares: { role: CardImpactRole; count: number }[] = [
      { role: "main", count: mainCount },
      { role: "material", count: materialCount },
      { role: "sideboard", count: sideboardCount },
    ];
    const dominant = shares.find((s) => s.count / sectionTotal >= 0.8);
    const role: CardImpactRole = dominant?.role ?? "mixed";

    entries.push({
      cardName,
      role,
      deckCountWith: withN,
      deckCountWithout: withoutN,
      avgWinRateWith: withSum / withN,
      avgWinRateWithout: withoutSum / withoutN,
      adjustedLift: shrunkWith - shrunkWithout,
    });
  }

  entries.sort((a, b) => b.adjustedLift - a.adjustedLift);
  return entries;
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
