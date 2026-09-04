import assert from "node:assert/strict";
import test from "node:test";
import type { ArchetypeCluster, ArchetypeTaxonomyData, ClusterMatchupImpact, MatchupCardImpactData } from "@gatcg/shared";
import { classifyDeckAgainstTaxonomy, computeDeckTestResult, type DeckTestResultInputs } from "../src/lib/deckTestResult";
import type { DeckInteraction } from "../src/features/decks/useDeckWinConditions";

function cluster(id: string, overrides: Partial<ArchetypeCluster> = {}): ArchetypeCluster {
  return {
    id,
    championName: "Test Champion",
    championBreakdown: [],
    name: `Cluster ${id}`,
    deckCount: 10,
    playerCount: 8,
    eventCount: 3,
    confidence: "established",
    avgWinRate: 0.55,
    winRateInterval: { low: 0.45, high: 0.65, matches: 20 },
    quality: { meanSimilarity: 0.6, minSimilarity: 0.5, meanAssignmentMargin: 0.2 },
    definingCards: [],
    mainDefiningCards: [],
    materialDefiningCards: [],
    mainDeckAverageCards: [],
    materialDeckAverageCards: [],
    materialArchetypeId: `material-${id}`,
    strategyArchetypeId: `strategy-${id}`,
    deckIds: [],
    seasons: [],
    trend: null,
    metaShare: 0.1,
    topCutCount: 3,
    topCutRate: 0.3,
    avgPlacement: 5,
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    ...overrides,
  };
}

function taxonomy(clusters: ArchetypeCluster[]): ArchetypeTaxonomyData {
  return {
    generatedAt: "",
    clusters,
    materialArchetypes: [],
    strategyArchetypes: [],
    coverage: { classifiedDeckCount: 0, totalDeckCount: 0, classificationRate: 0 },
    aliases: {},
    cardClusterIndex: {},
  };
}

function matchup(overrides: Partial<ClusterMatchupImpact> = {}): ClusterMatchupImpact {
  return {
    clusterId: "a",
    opponentClusterId: "opp",
    opponentClusterName: "Opponent",
    opponentChampionName: "Opp Champion",
    games: 10,
    baselineWinRate: 0.5,
    myCards: [],
    opponentCards: [],
    answers: [],
    ...overrides,
  };
}

function matchupData(matchups: ClusterMatchupImpact[]): MatchupCardImpactData {
  return { generatedAt: "", matchups };
}

function baseInputs(overrides: Partial<DeckTestResultInputs> = {}): DeckTestResultInputs {
  return {
    deckCardCounts: new Map(),
    taxonomy: taxonomy([]),
    matchupCardImpactData: undefined,
    deckClusterIndex: undefined,
    winConditions: [],
    nearestDecks: [],
    ...overrides,
  };
}

test("a deck matching a cluster's centroid exactly classifies as matched with similarity 1", () => {
  const clusterA = cluster("a", {
    mainDeckAverageCards: [{ name: "Card A", quantity: 4 }],
    materialDeckAverageCards: [{ name: "Card B", quantity: 2 }],
  });
  const deckCardCounts = new Map([
    ["Card A", 4],
    ["Card B", 2],
  ]);
  const classification = classifyDeckAgainstTaxonomy(deckCardCounts, [clusterA]);
  assert.equal(classification.status, "matched");
  assert.equal(classification.cluster?.id, "a");
  assert.equal(classification.similarity, 1);
});

test("a deck with some but insufficient overlap classifies as borderline", () => {
  const clusterA = cluster("a", {
    mainDeckAverageCards: [
      { name: "Card A", quantity: 4 },
      { name: "Card C", quantity: 4 },
    ],
  });
  const deckCardCounts = new Map([
    ["Card A", 4],
    ["Card D", 4],
  ]);
  const classification = classifyDeckAgainstTaxonomy(deckCardCounts, [clusterA]);
  assert.equal(classification.status, "borderline");
  assert.ok(classification.similarity > 0 && classification.similarity < 0.45);
});

test("a deck sharing no cards with any cluster is unclassified", () => {
  const clusterA = cluster("a", { mainDeckAverageCards: [{ name: "Card A", quantity: 4 }] });
  const deckCardCounts = new Map([["Unrelated Card", 4]]);
  const classification = classifyDeckAgainstTaxonomy(deckCardCounts, [clusterA]);
  assert.equal(classification.status, "unclassified");
  assert.equal(classification.cluster, null);
  assert.equal(classification.assignmentMargin, null);
});

test("assignmentMargin is the gap between the best and second-best cluster", () => {
  const clusterA = cluster("a", { mainDeckAverageCards: [{ name: "Card A", quantity: 4 }] });
  const clusterB = cluster("b", {
    mainDeckAverageCards: [
      { name: "Card A", quantity: 2 },
      { name: "Card B", quantity: 2 },
    ],
  });
  const deckCardCounts = new Map([["Card A", 4]]);
  const classification = classifyDeckAgainstTaxonomy(deckCardCounts, [clusterA, clusterB]);
  assert.equal(classification.cluster?.id, "a");
  assert.ok(classification.assignmentMargin !== null && classification.assignmentMargin > 0);
});

test("a real deck with a known deckClusterIndex entry uses the authoritative cluster directly, not a best-guess reclassification", () => {
  const clusterA = cluster("a", { mainDeckAverageCards: [{ name: "Card A", quantity: 4 }] });
  const clusterB = cluster("b", { mainDeckAverageCards: [{ name: "Card Z", quantity: 4 }] });
  // The deck's actual cards look nothing like cluster A's centroid, but deckClusterIndex says it
  // belongs to A anyway — the pipeline's own authoritative assignment wins over a client-side guess.
  const result = computeDeckTestResult(
    baseInputs({
      deckCardCounts: new Map([["Card Z", 4]]),
      taxonomy: taxonomy([clusterA, clusterB]),
      deckClusterIndex: { "1:1": "a" },
      deckId: "1:1",
    }),
  );
  assert.equal(result.classification.status, "matched");
  assert.equal(result.classification.cluster?.id, "a");
  assert.equal(result.classification.assignmentMargin, null);
});

test("performance is a pass-through of the matched cluster's own fields, and null when unclassified", () => {
  const clusterA = cluster("a", {
    mainDeckAverageCards: [{ name: "Card A", quantity: 4 }],
    avgWinRate: 0.61,
    winRateInterval: { low: 0.5, high: 0.7, matches: 40 },
  });
  const matched = computeDeckTestResult(baseInputs({ deckCardCounts: new Map([["Card A", 4]]), taxonomy: taxonomy([clusterA]) }));
  assert.equal(matched.performance?.winRate, 0.61);
  assert.deepEqual(matched.performance?.interval95, { low: 0.5, high: 0.7, matches: 40 });

  const unclassified = computeDeckTestResult(baseInputs({ deckCardCounts: new Map([["Nothing Shared", 1]]), taxonomy: taxonomy([clusterA]) }));
  assert.equal(unclassified.performance, null);
});

test("matchups are filtered to the matched cluster's id and sorted by games descending", () => {
  const clusterA = cluster("a", { mainDeckAverageCards: [{ name: "Card A", quantity: 4 }] });
  const matchups = matchupData([
    matchup({ clusterId: "a", opponentClusterId: "x", games: 5 }),
    matchup({ clusterId: "a", opponentClusterId: "y", games: 20 }),
    matchup({ clusterId: "other-cluster", opponentClusterId: "z", games: 100 }),
  ]);
  const result = computeDeckTestResult(
    baseInputs({ deckCardCounts: new Map([["Card A", 4]]), taxonomy: taxonomy([clusterA]), matchupCardImpactData: matchups }),
  );
  assert.equal(result.matchups.length, 2);
  assert.equal(result.matchups[0].opponentClusterId, "y");
  assert.equal(result.matchups[1].opponentClusterId, "x");
});

test("winConditions and nearestDecks pass through unchanged", () => {
  const winConditions: DeckInteraction[] = [
    { anchorCard: "X", memberCards: ["Y"], evidenceKinds: ["Named rules-text link"], confidenceTier: "strong", confidence: 0.9, lift: 1.2, matchingDecks: 5, populationDecks: 100 },
  ];
  const nearestDecks = [{ deckId: "1:1", label: "Some Deck", similarity: 0.8 }];
  const result = computeDeckTestResult(baseInputs({ winConditions, nearestDecks }));
  assert.equal(result.winConditions, winConditions);
  assert.equal(result.nearestDecks, nearestDecks);
});

test("cautions flag an emerging build, a single-event population, and matchups with no card-level findings yet", () => {
  const clusterA = cluster("a", {
    mainDeckAverageCards: [{ name: "Card A", quantity: 4 }],
    confidence: "emerging",
    eventCount: 1,
  });
  const matchups = matchupData([matchup({ clusterId: "a", opponentClusterId: "x", games: 6, myCards: [], opponentCards: [] })]);
  const result = computeDeckTestResult(
    baseInputs({ deckCardCounts: new Map([["Card A", 4]]), taxonomy: taxonomy([clusterA]), matchupCardImpactData: matchups }),
  );
  assert.ok(result.cautions.some((c) => c.includes("emerging signal")));
  assert.ok(result.cautions.some((c) => c.includes("single event")));
  assert.ok(result.cautions.some((c) => c.includes("card-level findings")));
});

test("an unclassified deck cautions that no build resembles it", () => {
  const clusterA = cluster("a", { mainDeckAverageCards: [{ name: "Card A", quantity: 4 }] });
  const result = computeDeckTestResult(baseInputs({ deckCardCounts: new Map([["Unrelated", 1]]), taxonomy: taxonomy([clusterA]) }));
  assert.equal(result.classification.status, "unclassified");
  assert.ok(result.cautions.some((c) => c.includes("No published build resembles")));
});
