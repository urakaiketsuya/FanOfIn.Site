import {
  computeCardImpactEntries,
  type ArchetypeCluster,
  type CardImpactEntry,
  type CardSectionRow,
  type ClusterMatchupImpact,
  type DeckSections,
  type MatchupCardImpactData,
} from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures, type DeckSignature } from "./decklists.js";
import { config } from "../config.js";

function sectionsFromSignature(sig: DeckSignature): DeckSections {
  return {
    main: new Set(sig.mainCards.map((l) => l.name)),
    material: new Set(sig.materialCards.map((l) => l.name)),
    sideboard: new Set(sig.sideboardCards.map((l) => l.name)),
  };
}

interface MatchupRow {
  sectionsA: DeckSections;
  sectionsB: DeckSections;
  /** From clusterA's perspective: 1 = win, 0.5 = tie, 0 = loss. */
  outcomeA: number;
}

interface MatchupAccum {
  clusterA: string;
  clusterB: string;
  rows: MatchupRow[];
}

/**
 * Card Impact scoped to one specific opponent named build, computed from real per-game pairing
 * outcomes rather than event-aggregate win rate — the only way to isolate "how did this build do
 * specifically against THIS opponent build". Named-build-vs-named-build is a small population by
 * construction: even the biggest single Champion-level matchup in the whole dataset tops out
 * around 1,600 games, and a specific cluster vs a specific opponent cluster is a fraction of that.
 * So most matchups will have too few games for a card-level breakdown — those still get a
 * `games`/`baselineWinRate` summary with empty card arrays rather than being omitted outright, so
 * the UI can say "not enough data" instead of the matchup silently not existing. See
 * docs/CALCULATIONS.md.
 */
export function computeMatchupCardImpact(
  bundles: OmnidexEventBundle[],
  cardIndex: Map<string, CardSignature>,
  clusters: ArchetypeCluster[],
): MatchupCardImpactData {
  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const deckClusterIndex = new Map<string, string>();
  for (const cluster of clusters) {
    for (const deckId of cluster.deckIds) deckClusterIndex.set(deckId, cluster.id);
  }

  // Keyed "${clusterA}__${clusterB}" — A-vs-B and B-vs-A are two separate entries (not the same
  // pairing counted twice under one reversible key), since "my cards" vs "opponent cards" are
  // asymmetric and each cluster needs its own view of the matchup.
  const accum = new Map<string, MatchupAccum>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);

    for (const roundData of bundle.pairingsByRound) {
      if ("error" in roundData) continue;
      for (const pairing of roundData.pairings) {
        if (pairing.pairing.length !== 2) continue;
        const [sideA, sideB] = pairing.pairing;
        const clusterA = deckClusterIndex.get(`${bundle.id}:${sideA.id}`);
        const clusterB = deckClusterIndex.get(`${bundle.id}:${sideB.id}`);
        if (!clusterA || !clusterB) continue;
        const sigA = signatures.get(sideA.id);
        const sigB = signatures.get(sideB.id);
        if (!sigA || !sigB) continue;

        const outcomeA = sideA.status === "winner" ? 1 : sideB.status === "winner" ? 0 : 0.5;
        const sectionsA = sectionsFromSignature(sigA);
        const sectionsB = sectionsFromSignature(sigB);

        const keyAB = `${clusterA}__${clusterB}`;
        const entryAB = accum.get(keyAB) ?? { clusterA, clusterB, rows: [] };
        entryAB.rows.push({ sectionsA, sectionsB, outcomeA });
        accum.set(keyAB, entryAB);

        const keyBA = `${clusterB}__${clusterA}`;
        const entryBA = accum.get(keyBA) ?? { clusterA: clusterB, clusterB: clusterA, rows: [] };
        entryBA.rows.push({ sectionsA: sectionsB, sectionsB: sectionsA, outcomeA: 1 - outcomeA });
        accum.set(keyBA, entryBA);
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;
  const minSample = config.cardImpactMinSampleSize;

  const matchups: ClusterMatchupImpact[] = [];
  for (const { clusterA, clusterB, rows } of accum.values()) {
    const opponentCluster = clusterById.get(clusterB);
    if (!opponentCluster) continue;

    const games = rows.length;
    const baselineWinRate = rows.reduce((sum, r) => sum + r.outcomeA, 0) / games;

    // Below this floor a card-level with/without split is guaranteed to come up empty (both
    // computeCardImpactEntries buckets need >= minSample games each) — skip the work, but still
    // publish the games/baselineWinRate summary below.
    let myCards: CardImpactEntry[] = [];
    let opponentCards: CardImpactEntry[] = [];
    if (games >= config.minBattleChartSampleSize) {
      const myRows: CardSectionRow[] = rows.map((r) => ({ sections: r.sectionsA, outcome: r.outcomeA }));
      myCards = computeCardImpactEntries(myRows, baselineWinRate, prior, minSample);

      // Bucketed by whether the OPPONENT had the card, but still scored against MY outcome — a
      // negative adjustedLift here means "when they have this card, I do worse against them."
      const opponentRows: CardSectionRow[] = rows.map((r) => ({ sections: r.sectionsB, outcome: r.outcomeA }));
      opponentCards = computeCardImpactEntries(opponentRows, baselineWinRate, prior, minSample).sort(
        (a, b) => a.adjustedLift - b.adjustedLift,
      );
    }

    matchups.push({
      clusterId: clusterA,
      opponentClusterId: clusterB,
      opponentClusterName: opponentCluster.name,
      opponentChampionName: opponentCluster.championName,
      games,
      baselineWinRate,
      myCards,
      opponentCards,
    });
  }

  matchups.sort((a, b) => b.games - a.games);
  return { generatedAt: new Date().toISOString(), matchups };
}
