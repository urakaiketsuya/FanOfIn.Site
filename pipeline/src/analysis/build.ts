import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EVENT_CATEGORY_ORDER, type CardStat, type DeckSimilarityEntry, type PriceData } from "@gatcg/shared";
import { listCachedBundles } from "../omnidex/cache.js";
import { loadCardCatalog, buildCardIndex } from "../cards/catalog.js";
import { computeEloRatings } from "./elo.js";
import { computeCardStats } from "./cardStats.js";
import { computeKeywordStats } from "./keywordStats.js";
import { computeArchetypeAnalysis } from "./archetypes.js";
import { computeHipsterScores } from "./hipster.js";
import { computeDeckSimilarity } from "./similarity.js";
import { computePlayerDeckProfiles } from "./playerDecks.js";
import { computeDeckSightings } from "./deckSightings.js";
import { computeChampionTrends } from "./championTrends.js";
import { computeDeckCardIndex } from "./deckCardIndex.js";
import { computeArchetypeTaxonomy } from "./archetypeTaxonomy.js";
import { computeCardImpact } from "./cardImpact.js";
import { computeAchievements } from "./achievements.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/analysis");
const PRICES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/prices.json");

async function loadPriceByName(): Promise<Map<string, number>> {
  const priceByName = new Map<string, number>();
  try {
    const data = JSON.parse(await readFile(PRICES_PATH, "utf-8")) as PriceData;
    for (const entry of Object.values(data.prices)) {
      const market = entry.normal?.market ?? entry.foil?.market ?? null;
      if (market === null) continue;
      const existing = priceByName.get(entry.cardName);
      if (existing === undefined || market > existing) priceByName.set(entry.cardName, market);
    }
  } catch {
    // pricing pipeline hasn't run yet — money-card tagging is just skipped this run
  }
  return priceByName;
}

/**
 * Reads whatever's in the Omnidex cache (any subset — this doesn't require a full backfill to
 * be useful) plus the card catalog and published prices, and derives Elo ratings, card stats,
 * and archetype/battle-chart analysis. Pure local transform, same shape as omnidex/build.ts.
 */
export async function buildAnalysis(): Promise<void> {
  const completed = (await listCachedBundles()).filter((b) => b.event.status === "complete");

  const catalog = await loadCardCatalog();
  const cardIndex = buildCardIndex(catalog);
  const priceByName = await loadPriceByName();

  function cardStatsFor(bundles: typeof completed): CardStat[] {
    return computeCardStats(bundles, cardIndex).map((stat) => ({ ...stat, marketPrice: priceByName.get(stat.name) ?? null }));
  }

  await mkdir(DATA_DIR, { recursive: true });

  // Each of these is fast and independent of deck similarity (the one slow, champion-scoped
  // step below) — writing them out as soon as they're computed means a kill/crash during the
  // slow part still leaves fresh data for everything else, instead of holding all of it hostage
  // until the entire analysis run finishes.
  const { ratings, upsets } = computeEloRatings(completed);
  await writeFile(
    path.join(DATA_DIR, "elo.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      ratings: Array.from(ratings.values()).sort((a, b) => b.rating - a.rating),
      upsets: [...upsets].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    }),
    "utf-8",
  );

  const cardStats = cardStatsFor(completed);
  const cardStatsByCategory: Record<string, CardStat[]> = {};
  for (const category of EVENT_CATEGORY_ORDER) {
    const subset = completed.filter((b) => b.event.category === category);
    if (subset.length === 0) continue;
    cardStatsByCategory[category] = cardStatsFor(subset);
  }
  await writeFile(
    path.join(DATA_DIR, "cards.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), cards: cardStats, byCategory: cardStatsByCategory }),
    "utf-8",
  );

  const keywordStats = computeKeywordStats(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "keyword-stats.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), keywords: keywordStats }),
    "utf-8",
  );

  const { archetypes, namedSpirits, battleChart } = computeArchetypeAnalysis(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "archetypes.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), archetypes, namedSpirits, battleChart }),
    "utf-8",
  );

  const { deckScores, playerScores } = computeHipsterScores(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "hipster.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), deckScores, playerScores }),
    "utf-8",
  );

  const playerDeckProfiles = computePlayerDeckProfiles(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "player-decks.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), players: playerDeckProfiles }),
    "utf-8",
  );

  const deckSightings = computeDeckSightings(completed, cardIndex, priceByName);
  await writeFile(
    path.join(DATA_DIR, "deck-sightings.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sightings: deckSightings }),
    "utf-8",
  );

  const championTrends = computeChampionTrends(deckSightings);
  await writeFile(path.join(DATA_DIR, "champion-trends.json"), JSON.stringify(championTrends), "utf-8");

  const archetypeTaxonomy = computeArchetypeTaxonomy(completed, cardIndex, deckSightings, priceByName);
  await writeFile(path.join(DATA_DIR, "archetype-taxonomy.json"), JSON.stringify(archetypeTaxonomy), "utf-8");

  const achievements = computeAchievements(completed, cardIndex, ratings, upsets, deckScores, deckSightings);
  await writeFile(path.join(DATA_DIR, "achievements.json"), JSON.stringify(achievements), "utf-8");

  const { cardNames: deckCardIndexNames, entries: deckCardIndex } = await computeDeckCardIndex(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "deck-card-index.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), cardNames: deckCardIndexNames, decks: deckCardIndex }),
    "utf-8",
  );

  const cardImpact = computeCardImpact(archetypeTaxonomy.clusters, { cardNames: deckCardIndexNames, entries: deckCardIndex }, deckSightings);
  await writeFile(path.join(DATA_DIR, "card-impact.json"), JSON.stringify(cardImpact), "utf-8");

  // Similarity is the slow, champion-scoped step — write similarity.json incrementally as each
  // champion group finishes (see `onChampionComplete` below) rather than only once at the end,
  // so a kill/crash mid-run keeps whichever champions already completed instead of losing them.
  const similarityPath = path.join(DATA_DIR, "similarity.json");
  const similarDecksSoFar: DeckSimilarityEntry[] = [];
  const similarDecks = await computeDeckSimilarity(completed, cardIndex, async (championEntries) => {
    similarDecksSoFar.push(...championEntries);
    await writeFile(similarityPath, JSON.stringify({ generatedAt: new Date().toISOString(), decks: similarDecksSoFar }), "utf-8");
  });

  console.log(
    `analysis: ${ratings.size} rated players, ${upsets.length} upsets, ${cardStats.length} cards, ${keywordStats.length} keywords, ${archetypes.length} archetypes, ${namedSpirits.length} named spirits, ${championTrends.champions.length} champion trends across ${championTrends.seasonOrder.length} seasons, ${archetypeTaxonomy.clusters.length} named builds, ${cardImpact.clusters.length} builds with card-impact data, ${achievements.unlocks.length} achievement unlocks, ${similarDecks.length} decks with similarity matches, ${playerDeckProfiles.length} player deck profiles, ${deckSightings.length} deck sightings, ${deckCardIndex.length} decks in card index`,
  );
}
