import {
  weightedJaccard,
  type ArchetypeCluster,
  type ArchetypeClusterTrend,
  type ArchetypeTaxonomyData,
  type ClusterMatchupImpact,
  type MatchupCardImpactData,
} from "@gatcg/shared";
import type { DeckInteraction } from "../features/decks/useDeckWinConditions";

/**
 * Same threshold the pipeline uses to decide whether a build qualifies to join a cluster
 * (`CLUSTER_THRESHOLD` in `pipeline/src/analysis/archetypeTaxonomy.ts`), already duplicated
 * app-side once for the same reason (`VARIANT_SIMILARITY_THRESHOLD` in
 * `useArchetypeVariants.ts`) — reused here rather than inventing a second cutoff. See
 * docs/CALCULATIONS.md's "Test This Deck" entry for the reasoning behind the borderline band.
 */
export const DECK_TEST_MATCH_THRESHOLD = 0.45;

export interface DeckTestClassification {
  /** "matched": similarity clears the threshold this deck would need to join that cluster.
   * "borderline": closest available cluster, but wouldn't have made the cut.
   * "unclassified": no published cluster shares any card with this decklist. */
  status: "matched" | "borderline" | "unclassified";
  cluster: ArchetypeCluster | null;
  similarity: number;
  /** Best similarity minus second-best, across every scored cluster. Null for an authoritative
   * match (a real deck's own pipeline-assigned cluster, not a scored guess) or when fewer than
   * two clusters scored above zero. */
  assignmentMargin: number | null;
}

export interface DeckTestPerformance {
  winRate: number;
  interval95: { low: number; high: number; matches: number };
  deckCount: number;
  playerCount: number;
  eventCount: number;
  topCutRate: number;
  avgPlacement: number | null;
  trend: ArchetypeClusterTrend | null;
  confidence: "established" | "emerging";
}

export interface DeckTestNearestDeck {
  deckId: string;
  label: string;
  similarity: number;
}

export interface DeckTestResult {
  classification: DeckTestClassification;
  /** Straight pass-through of the matched cluster's own published fields — no recompute. Null when unclassified. */
  performance: DeckTestPerformance | null;
  /** matchup-card-impact.json rows for the matched cluster, sorted by games descending — each already carries myCards/opponentCards/answers. */
  matchups: ClusterMatchupImpact[];
  winConditions: DeckInteraction[];
  nearestDecks: DeckTestNearestDeck[];
  /** Plain-language notes derived from the fields above — no new scoring machinery. */
  cautions: string[];
}

/** A cluster's own published centroid (average copies per sighting, main+material combined) — cheap to build client-side, no need to re-scan the deck universe. */
export function buildClusterCentroid(cluster: ArchetypeCluster): Map<string, number> {
  const centroid = new Map<string, number>();
  for (const { name, quantity } of cluster.mainDeckAverageCards) centroid.set(name, quantity);
  for (const { name, quantity } of cluster.materialDeckAverageCards) centroid.set(name, (centroid.get(name) ?? 0) + quantity);
  return centroid;
}

/**
 * Scores an arbitrary deck (main+material card-copy multiset) against every published cluster's
 * centroid and returns the best match — nothing in the pipeline or app does this today for a
 * candidate deck that isn't already a member of some cluster (a Deck Builder build in progress,
 * or a real deck the pipeline left unclustered). ~116 clusters, one in-browser pass.
 */
export function classifyDeckAgainstTaxonomy(deckCardCounts: Map<string, number>, clusters: ArchetypeCluster[]): DeckTestClassification {
  const scored = clusters
    .map((cluster) => ({ cluster, similarity: weightedJaccard(deckCardCounts, buildClusterCentroid(cluster)) }))
    .sort((a, b) => b.similarity - a.similarity);

  const best = scored[0];
  if (!best || best.similarity === 0) {
    return { status: "unclassified", cluster: null, similarity: 0, assignmentMargin: null };
  }
  const secondBest = scored[1]?.similarity;
  return {
    status: best.similarity >= DECK_TEST_MATCH_THRESHOLD ? "matched" : "borderline",
    cluster: best.cluster,
    similarity: best.similarity,
    assignmentMargin: secondBest !== undefined && secondBest > 0 ? best.similarity - secondBest : null,
  };
}

function buildCautions(classification: DeckTestClassification, performance: DeckTestPerformance | null, matchups: ClusterMatchupImpact[]): string[] {
  const cautions: string[] = [];
  if (classification.status === "unclassified") {
    cautions.push("No published build resembles this decklist closely enough to report historical performance.");
  } else if (classification.status === "borderline") {
    cautions.push(
      `Closest historical match is only ${Math.round(classification.similarity * 100)}% similar — treat performance below as a loose comparison, not this exact list's record.`,
    );
  }
  if (performance?.confidence === "emerging") {
    cautions.push("This build is an emerging signal, not yet an established archetype — small sample.");
  }
  if (performance && performance.eventCount <= 1) {
    cautions.push("Every recorded sighting of this build comes from a single event.");
  }
  if (matchups.length > 0 && matchups.every((m) => m.myCards.length === 0 && m.opponentCards.length === 0)) {
    cautions.push("No individual matchup has enough games yet for card-level findings — only overall matchup win rates are available.");
  }
  return cautions;
}

export interface DeckTestResultInputs {
  /** Main+material card-copy multiset — "deck identity" convention used everywhere else in this codebase. */
  deckCardCounts: Map<string, number>;
  taxonomy: ArchetypeTaxonomyData;
  matchupCardImpactData: MatchupCardImpactData | undefined;
  /** From CardImpactData.deckClusterIndex — the pipeline's own authoritative deckId -> clusterId assignment. */
  deckClusterIndex: Record<string, string> | undefined;
  /** Present for a real published deck; absent for a Deck Builder build in progress. */
  deckId?: string;
  /** Caller-computed via useDeckWinConditions — a hook, so it can't be called from this pure function. */
  winConditions: DeckInteraction[];
  nearestDecks: DeckTestNearestDeck[];
}

/**
 * Assembles one deck's "Test This Deck" report entirely from already-published datasets — no
 * recomputation of anything `docs/CALCULATIONS.md` already documents. A real deck with a known
 * cluster membership (`deckClusterIndex`) is classified authoritatively; anything else (a build in
 * progress, or a deck the pipeline left unclustered) gets a best-guess classification instead. Deck-
 * shape-agnostic, same "pure compute" pattern as `computeDeckWinConditions`.
 */
export function computeDeckTestResult(inputs: DeckTestResultInputs): DeckTestResult {
  const { deckCardCounts, taxonomy, matchupCardImpactData, deckClusterIndex, deckId, winConditions, nearestDecks } = inputs;

  const authoritativeClusterId = deckId ? deckClusterIndex?.[deckId] : undefined;
  const authoritativeCluster = authoritativeClusterId ? (taxonomy.clusters.find((c) => c.id === authoritativeClusterId) ?? null) : null;

  const classification: DeckTestClassification = authoritativeCluster
    ? {
        status: "matched",
        cluster: authoritativeCluster,
        similarity: weightedJaccard(deckCardCounts, buildClusterCentroid(authoritativeCluster)),
        assignmentMargin: null,
      }
    : classifyDeckAgainstTaxonomy(deckCardCounts, taxonomy.clusters);

  const cluster = classification.cluster;
  const performance: DeckTestPerformance | null = cluster
    ? {
        winRate: cluster.avgWinRate,
        interval95: cluster.winRateInterval,
        deckCount: cluster.deckCount,
        playerCount: cluster.playerCount,
        eventCount: cluster.eventCount,
        topCutRate: cluster.topCutRate,
        avgPlacement: cluster.avgPlacement,
        trend: cluster.trend,
        confidence: cluster.confidence,
      }
    : null;

  const matchups =
    cluster && matchupCardImpactData
      ? matchupCardImpactData.matchups.filter((m) => m.clusterId === cluster.id).sort((a, b) => b.games - a.games)
      : [];

  return {
    classification,
    performance,
    matchups,
    winConditions,
    nearestDecks,
    cautions: buildCautions(classification, performance, matchups),
  };
}
