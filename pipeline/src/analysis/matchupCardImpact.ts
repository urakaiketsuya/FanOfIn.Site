import {
  computeCardImpactEntries,
  type AnswerCardEntry,
  type ArchetypeCluster,
  type CardImpactEntry,
  type CardSectionRow,
  type ClusterMatchupImpact,
  type DeckSections,
  type MatchupCardImpactData,
  type OpponentCardAnswers,
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

function hasCard(sections: DeckSections, name: string): boolean {
  return sections.main.has(name) || sections.material.has(name) || sections.sideboard.has(name);
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

const MAX_ANSWERS_PER_CARD = 3;

/**
 * For opponent card B, which of my own cards correlate with a better outcome specifically in the
 * games where the opponent had B — restricted to that B-present row set, split by whether I also
 * had the candidate card, shrunk toward *that subset's own* mean outcome (not the whole matchup's
 * baseline, which would understate B's harm by mixing in the many games it wasn't even present).
 * Tries the precise `clusterRows` pool first; only pulls from the broader, ungated `championRows`
 * pool to fill remaining slots when the precise pool didn't produce enough (or any) qualifying
 * candidates — `computeCardImpactEntries` already silently drops anything that doesn't clear
 * `minSample` on both sides, so an empty/thin cluster pool naturally falls through here.
 */
function computeAnswersForCard(
  opponentCardName: string,
  clusterRows: MatchupRow[],
  championRows: MatchupRow[],
  prior: number,
  minSample: number,
): AnswerCardEntry[] {
  function candidatesFrom(rows: MatchupRow[]): CardImpactEntry[] {
    const bRows = rows.filter((r) => hasCard(r.sectionsB, opponentCardName));
    if (bRows.length === 0) return [];
    const subsetBaseline = bRows.reduce((sum, r) => sum + r.outcomeA, 0) / bRows.length;
    const sectionRows: CardSectionRow[] = bRows.map((r) => ({ sections: r.sectionsA, outcome: r.outcomeA }));
    return computeCardImpactEntries(sectionRows, subsetBaseline, prior, minSample).filter((c) => c.adjustedLift > 0);
  }

  const answers: AnswerCardEntry[] = candidatesFrom(clusterRows)
    .slice(0, MAX_ANSWERS_PER_CARD)
    .map((c) => ({
      cardName: c.cardName,
      role: c.role,
      mitigation: c.adjustedLift,
      sampleWithAnswer: c.deckCountWith,
      sampleWithoutAnswer: c.deckCountWithout,
      scope: "cluster" as const,
    }));

  if (answers.length < MAX_ANSWERS_PER_CARD) {
    const already = new Set(answers.map((a) => a.cardName));
    for (const c of candidatesFrom(championRows)) {
      if (answers.length >= MAX_ANSWERS_PER_CARD) break;
      if (already.has(c.cardName)) continue;
      answers.push({
        cardName: c.cardName,
        role: c.role,
        mitigation: c.adjustedLift,
        sampleWithAnswer: c.deckCountWith,
        sampleWithoutAnswer: c.deckCountWithout,
        scope: "champion",
      });
    }
  }

  return answers;
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

  // Same shape, keyed by "${championA}__${championB}" instead — every pairing between two
  // identified Champions, not gated by cluster membership at all. Much bigger population (every
  // deck of that Champion, not just the ones that landed in a named-build cluster), used only as
  // the fallback pool for `computeAnswersForCard` when a specific matchup's precise cluster-level
  // rows don't have enough games to support a further with/without-my-card split.
  const championAccum = new Map<string, MatchupRow[]>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);

    for (const roundData of bundle.pairingsByRound) {
      if ("error" in roundData) continue;
      for (const pairing of roundData.pairings) {
        if (pairing.pairing.length !== 2) continue;
        const [sideA, sideB] = pairing.pairing;
        const sigA = signatures.get(sideA.id);
        const sigB = signatures.get(sideB.id);
        if (!sigA || !sigB) continue;

        const outcomeA = sideA.status === "winner" ? 1 : sideB.status === "winner" ? 0 : 0.5;
        const sectionsA = sectionsFromSignature(sigA);
        const sectionsB = sectionsFromSignature(sigB);

        const clusterA = deckClusterIndex.get(`${bundle.id}:${sideA.id}`);
        const clusterB = deckClusterIndex.get(`${bundle.id}:${sideB.id}`);
        if (clusterA && clusterB) {
          const keyAB = `${clusterA}__${clusterB}`;
          const entryAB = accum.get(keyAB) ?? { clusterA, clusterB, rows: [] };
          entryAB.rows.push({ sectionsA, sectionsB, outcomeA });
          accum.set(keyAB, entryAB);

          const keyBA = `${clusterB}__${clusterA}`;
          const entryBA = accum.get(keyBA) ?? { clusterA: clusterB, clusterB: clusterA, rows: [] };
          entryBA.rows.push({ sectionsA: sectionsB, sectionsB: sectionsA, outcomeA: 1 - outcomeA });
          accum.set(keyBA, entryBA);
        }

        if (sigA.championName && sigB.championName) {
          const champKeyAB = `${sigA.championName}__${sigB.championName}`;
          const champRowsAB = championAccum.get(champKeyAB) ?? [];
          champRowsAB.push({ sectionsA, sectionsB, outcomeA });
          championAccum.set(champKeyAB, champRowsAB);

          const champKeyBA = `${sigB.championName}__${sigA.championName}`;
          const champRowsBA = championAccum.get(champKeyBA) ?? [];
          champRowsBA.push({ sectionsA: sectionsB, sectionsB: sectionsA, outcomeA: 1 - outcomeA });
          championAccum.set(champKeyBA, champRowsBA);
        }
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;
  const minSample = config.cardImpactMinSampleSize;

  const matchups: ClusterMatchupImpact[] = [];
  for (const { clusterA, clusterB, rows } of accum.values()) {
    const myCluster = clusterById.get(clusterA);
    const opponentCluster = clusterById.get(clusterB);
    if (!myCluster || !opponentCluster) continue;

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

    // "Answer" candidates only matter for cards that already qualified as hurting me — cluster
    // rows are this matchup's own precise pool; champion rows are the (much bigger, ungated)
    // fallback pool for whichever candidate cards that precise pool didn't have enough data for.
    const championRows = championAccum.get(`${myCluster.championName}__${opponentCluster.championName}`) ?? [];
    const answers: OpponentCardAnswers[] = [];
    for (const b of opponentCards) {
      const bAnswers = computeAnswersForCard(b.cardName, rows, championRows, prior, minSample);
      if (bAnswers.length > 0) answers.push({ opponentCardName: b.cardName, answers: bAnswers });
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
      answers,
    });
  }

  matchups.sort((a, b) => b.games - a.games);
  return { generatedAt: new Date().toISOString(), matchups };
}
