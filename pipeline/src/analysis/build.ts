import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EVENT_CATEGORY_ORDER, type CardStat, type PriceData } from "@gatcg/shared";
import { listCachedBundles } from "../omnidex/cache.js";
import { loadCardCatalog, buildCardIndex } from "../cards/catalog.js";
import { computeEloRatings } from "./elo.js";
import { computeCardStats } from "./cardStats.js";
import { computeArchetypeAnalysis } from "./archetypes.js";
import { computeHipsterScores } from "./hipster.js";
import { computeDeckSimilarity } from "./similarity.js";
import { computePlayerDeckProfiles } from "./playerDecks.js";
import { computeDeckSightings } from "./deckSightings.js";
import { computeDeckCardIndex } from "./deckCardIndex.js";

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

  const { ratings, upsets } = computeEloRatings(completed);
  const cardStats = cardStatsFor(completed);

  const cardStatsByCategory: Record<string, CardStat[]> = {};
  for (const category of EVENT_CATEGORY_ORDER) {
    const subset = completed.filter((b) => b.event.category === category);
    if (subset.length === 0) continue;
    cardStatsByCategory[category] = cardStatsFor(subset);
  }

  const { archetypes, battleChart } = computeArchetypeAnalysis(completed, cardIndex);
  const { deckScores, playerScores } = computeHipsterScores(completed, cardIndex);
  const similarDecks = await computeDeckSimilarity(completed, cardIndex);
  const playerDeckProfiles = computePlayerDeckProfiles(completed, cardIndex);
  const deckSightings = computeDeckSightings(completed, cardIndex);
  const deckCardIndex = computeDeckCardIndex(completed, cardIndex);

  await mkdir(DATA_DIR, { recursive: true });

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
    path.join(DATA_DIR, "cards.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), cards: cardStats, byCategory: cardStatsByCategory }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "archetypes.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), archetypes, battleChart }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "hipster.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), deckScores, playerScores }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "similarity.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), decks: similarDecks }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "player-decks.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), players: playerDeckProfiles }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "deck-sightings.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sightings: deckSightings }),
    "utf-8",
  );

  await writeFile(
    path.join(DATA_DIR, "deck-card-index.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), decks: deckCardIndex }),
    "utf-8",
  );

  console.log(
    `analysis: ${ratings.size} rated players, ${upsets.length} upsets, ${cardStats.length} cards, ${archetypes.length} archetypes, ${similarDecks.length} decks with similarity matches, ${playerDeckProfiles.length} player deck profiles, ${deckSightings.length} deck sightings, ${deckCardIndex.length} decks in card index`,
  );
}
