import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EVENT_CATEGORY_ORDER, priceKey, type CardStat, type DeckPopularityEntry, type DeckSimilarityEntry, type PriceData } from "@gatcg/shared";
import { listCachedBundles } from "../omnidex/cache.js";
import { loadCardCatalog, buildCardIndex, type CardSignature } from "../cards/catalog.js";
import { computeEloRatings } from "./elo.js";
import { computeRivals } from "./rivals.js";
import { computeCardStats } from "./cardStats.js";
import { computeKeywordStats } from "./keywordStats.js";
import { computeCardQuantityStats } from "./cardQuantityStats.js";
import { computeCompositionWinRates } from "./deckCompositionStats.js";
import { computeArchetypeAnalysis } from "./archetypes.js";
import { computeHipsterScores } from "./hipster.js";
import { computeDeckSimilarity } from "./similarity.js";
import { computePlayerDeckProfiles } from "./playerDecks.js";
import { computeDeckSightings } from "./deckSightings.js";
import { computeChampionTrends } from "./championTrends.js";
import { computeDeckCardIndex } from "./deckCardIndex.js";
import { computeArchetypeTaxonomy } from "./archetypeTaxonomy.js";
import { computeCardImpact } from "./cardImpact.js";
import { computeMatchupCardImpact } from "./matchupCardImpact.js";
import { computeAchievements } from "./achievements.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/analysis");
const PRICES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/prices.json");

/**
 * Joins each catalog card to its price via `editions` (set prefix + collector number — the same
 * precise key `data/prices.json` is keyed by), not by matching TCGPlayer's own product display
 * name against the GA catalog's card name. Name-string matching was silently failing whenever
 * TCGPlayer suffixed a product name the GA name doesn't have (e.g. "Stonescale Band" only listed
 * as "Stonescale Band (002B)") — confirmed on ~11% of all priced editions. Mirrors the per-edition
 * lookup `app/src/features/cards/CardDetail.tsx` already does client-side.
 */
async function loadPriceByName(cardIndex: Map<string, CardSignature>): Promise<Map<string, number>> {
  const priceByName = new Map<string, number>();
  try {
    const data = JSON.parse(await readFile(PRICES_PATH, "utf-8")) as PriceData;
    for (const card of cardIndex.values()) {
      let best: number | null = null;
      // `?? []` guards a stale on-disk card-catalog cache from before `editions` shipped.
      for (const ed of card.editions ?? []) {
        const entry = data.prices[priceKey(ed.setPrefix, ed.collectorNumber)];
        const market = entry?.normal?.market ?? entry?.foil?.market ?? null;
        if (market !== null && (best === null || market > best)) best = market;
      }
      if (best !== null) priceByName.set(card.name, best);
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
  const priceByName = await loadPriceByName(cardIndex);

  function cardStatsFor(bundles: typeof completed): CardStat[] {
    return computeCardStats(bundles, cardIndex).map((stat) => ({ ...stat, marketPrice: priceByName.get(stat.name) ?? null }));
  }

  await mkdir(DATA_DIR, { recursive: true });

  // Each of these is fast and independent of deck similarity (the one slow, champion-scoped
  // step below) — writing them out as soon as they're computed means a kill/crash during the
  // slow part still leaves fresh data for everything else, instead of holding all of it hostage
  // until the entire analysis run finishes.
  const { ratings, upsets, history } = computeEloRatings(completed);
  await writeFile(
    path.join(DATA_DIR, "elo.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      ratings: Array.from(ratings.values()).sort((a, b) => b.rating - a.rating),
      upsets: [...upsets].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    }),
    "utf-8",
  );
  await writeFile(
    path.join(DATA_DIR, "elo-history.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      history: Object.fromEntries(Array.from(history.entries()).map(([id, points]) => [String(id), points])),
    }),
    "utf-8",
  );

  const rivals = computeRivals(completed);
  await writeFile(
    path.join(DATA_DIR, "rivals.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), players: rivals }),
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

  const cardQuantityStats = computeCardQuantityStats(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "card-quantity-stats.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), cards: cardQuantityStats }),
    "utf-8",
  );

  const compositionWinRates = computeCompositionWinRates(completed, cardIndex);
  await writeFile(
    path.join(DATA_DIR, "composition-win-rates.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), stats: compositionWinRates }),
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

  // Lean projection for useDeckPopularity.ts (Popular Decks / All Decks) — those pages only need
  // championName + per-sighting outcome + event context to group/rank decks, not the full
  // DeckSighting (keywords, price, repeated event/season name strings) that makes deck-sightings.json
  // 40MB+. See the DeckPopularityEntry doc comment in shared/src/analysis-types.ts.
  const deckPopularityIndex: DeckPopularityEntry[] = deckSightings.map((s) => ({
    deckId: s.deckId,
    championName: s.championName,
    player: s.player,
    eventId: s.eventId,
    eventDate: s.eventDate,
    placement: s.placement,
    winRate: s.winRate,
    weightedScore: s.weightedScore,
  }));
  await writeFile(
    path.join(DATA_DIR, "deck-popularity-index.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: deckPopularityIndex }),
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

  const matchupCardImpact = computeMatchupCardImpact(completed, cardIndex, archetypeTaxonomy.clusters);
  await writeFile(path.join(DATA_DIR, "matchup-card-impact.json"), JSON.stringify(matchupCardImpact), "utf-8");

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
    `analysis: ${ratings.size} rated players, ${rivals.length} players with rival data, ${upsets.length} upsets, ${cardStats.length} cards, ${keywordStats.length} keywords, ${cardQuantityStats.length} cards with quantity stats, ${compositionWinRates.length} composition win-rate buckets, ${archetypes.length} archetypes, ${namedSpirits.length} named spirits, ${championTrends.champions.length} champion trends across ${championTrends.seasonOrder.length} seasons, ${archetypeTaxonomy.clusters.length} named builds, ${cardImpact.clusters.length} builds with card-impact data, ${matchupCardImpact.matchups.length} archetype matchups tracked, ${achievements.unlocks.length} achievement unlocks, ${similarDecks.length} decks with similarity matches, ${playerDeckProfiles.length} player deck profiles, ${deckSightings.length} deck sightings, ${deckCardIndex.length} decks in card index`,
  );
}
