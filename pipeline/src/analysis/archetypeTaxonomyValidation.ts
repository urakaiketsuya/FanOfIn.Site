import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ArchetypeCluster, ArchetypeTaxonomyData, DeckSighting, DeckSightingsData } from "@gatcg/shared";
import { listCachedBundles } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildCardIndex } from "../cards/catalog.js";
import { computeArchetypeTaxonomy } from "./archetypeTaxonomy.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, "../../..");
const THRESHOLDS = [0.4, 0.45, 0.5];

interface GoldExpectation {
  label: string;
  champion: string;
  requiredCards: string[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function assignmentByDeck(data: ArchetypeTaxonomyData): Map<string, string> {
  const result = new Map<string, string>();
  for (const cluster of data.clusters) for (const deckId of cluster.deckIds) result.set(deckId, cluster.id);
  return result;
}

/** Match candidate clusters to baseline clusters by maximum deck overlap, then score shared-deck agreement. */
function assignmentAgreement(baseline: ArchetypeTaxonomyData, candidate: ArchetypeTaxonomyData): number {
  const baselineByDeck = assignmentByDeck(baseline);
  const candidateByDeck = assignmentByDeck(candidate);
  const baselineDecksByCluster = new Map<string, Set<string>>();
  for (const [deckId, clusterId] of baselineByDeck) {
    const decks = baselineDecksByCluster.get(clusterId) ?? new Set<string>();
    decks.add(deckId);
    baselineDecksByCluster.set(clusterId, decks);
  }
  const candidateToBaseline = new Map<string, string>();
  for (const cluster of candidate.clusters) {
    const overlaps = new Map<string, number>();
    for (const deckId of cluster.deckIds) {
      const baselineId = baselineByDeck.get(deckId);
      if (baselineId) overlaps.set(baselineId, (overlaps.get(baselineId) ?? 0) + 1);
    }
    const best = Array.from(overlaps.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (best) candidateToBaseline.set(cluster.id, best[0]);
  }
  let shared = 0;
  let agreed = 0;
  for (const [deckId, baselineId] of baselineByDeck) {
    const candidateId = candidateByDeck.get(deckId);
    if (!candidateId) continue;
    shared++;
    if (candidateToBaseline.get(candidateId) === baselineId) agreed++;
  }
  return shared > 0 ? agreed / shared : 0;
}

function checkGoldSet(clusters: ArchetypeCluster[], goldSet: GoldExpectation[]) {
  return goldSet.map((expectation) => {
    const match = clusters.find(
      (cluster) =>
        cluster.championBreakdown.some((champion) => champion.championName === expectation.champion) &&
        expectation.requiredCards.every((card) => cluster.definingCards.some((defining) => defining.name === card)),
    );
    return { ...expectation, passed: !!match, clusterId: match?.id ?? null, clusterName: match?.name ?? null };
  });
}

async function main() {
  const [bundles, cardCacheRaw, sightingsRaw, goldRaw] = await Promise.all([
    listCachedBundles(),
    readFile(path.join(REPO_ROOT, "pipeline/.cache/cards.json"), "utf-8"),
    readFile(path.join(REPO_ROOT, "data/analysis/deck-sightings.json"), "utf-8"),
    readFile(path.join(HERE, "fixtures/archetype-gold-set.json"), "utf-8"),
  ]);
  const completed = bundles.filter((bundle) => bundle.event.status === "complete");
  const cardIndex = buildCardIndex((JSON.parse(cardCacheRaw) as { cards: CardSignature[] }).cards);
  const deckSightings = (JSON.parse(sightingsRaw) as DeckSightingsData).sightings as DeckSighting[];
  const goldSet = JSON.parse(goldRaw) as GoldExpectation[];
  const builds = new Map<number, ArchetypeTaxonomyData>();
  for (const threshold of THRESHOLDS) {
    console.log(`archetype validation: threshold ${threshold.toFixed(2)}`);
    builds.set(threshold, computeArchetypeTaxonomy(completed, cardIndex, deckSightings, new Map(), { clusterThreshold: threshold }));
  }
  const baseline = builds.get(0.45)!;
  const datedSightings = deckSightings.filter((sighting) => sighting.eventDate).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const cutoff = datedSightings[Math.floor(datedSightings.length * 0.8)]?.eventDate ?? "";
  const historicalSightings = deckSightings.filter((sighting) => sighting.eventDate <= cutoff);
  const historicalEventIds = new Set(historicalSightings.map((sighting) => sighting.eventId));
  const historical = computeArchetypeTaxonomy(
    completed.filter((bundle) => historicalEventIds.has(bundle.id)),
    cardIndex,
    historicalSightings,
    new Map(),
    { clusterThreshold: 0.45 },
  );
  const thresholds = THRESHOLDS.map((threshold) => {
    const data = builds.get(threshold)!;
    return {
      threshold,
      clusterCount: data.clusters.length,
      establishedCount: data.clusters.filter((cluster) => cluster.confidence === "established").length,
      classificationRate: data.coverage.classificationRate,
      medianMeanSimilarity: median(data.clusters.map((cluster) => cluster.quality.meanSimilarity)),
      medianAssignmentMargin: median(data.clusters.map((cluster) => cluster.quality.meanAssignmentMargin)),
      assignmentAgreementWithBaseline: assignmentAgreement(baseline, data),
      goldSet: checkGoldSet(data.clusters, goldSet),
    };
  });
  const report = {
    generatedAt: new Date().toISOString(),
    baselineThreshold: 0.45,
    temporalHoldout: {
      cutoff,
      historicalDeckCount: historicalSightings.length,
      historicalClusterCount: historical.clusters.length,
      assignmentAgreementWithFull: assignmentAgreement(baseline, historical),
    },
    thresholds,
  };
  await writeFile(path.join(REPO_ROOT, "data/analysis/archetype-taxonomy-validation.json"), JSON.stringify(report), "utf-8");
  console.log(JSON.stringify(report, null, 2));
  if (thresholds.some((result) => result.goldSet.some((check) => !check.passed))) process.exitCode = 1;
}

await main();
