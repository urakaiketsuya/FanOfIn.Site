import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { loadCardCatalog, buildCardIndex } from "../../cards/catalog.js";
import { listCachedDecks } from "../cache.js";
import { shouldKeepDeck } from "../filter.js";
import { computeCardInclusion } from "./cardInclusion.js";
import { computePopularity } from "./popularity.js";
import { computePriceDistribution } from "./priceDistribution.js";
import { computeArchetypeClustering } from "./archetypeClustering.js";
import { computeDeckEra } from "./deckEra.js";
import { computeCoOccurrence } from "./coOccurrence.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../data/shoutatyourdecks/analytics");

/**
 * Pure local transform, no network — reads whatever's currently in the cache (populated by
 * harvest.ts/metadataFetch.ts/decklistFetch.ts) and computes all four analytics independently, so
 * this can be safely re-run at any point during a still-in-progress crawl (see each stat's own
 * decksConsidered field for exactly how much data went into that particular number) as well as
 * after it's complete. Deliberately standalone from pipeline/src/analysis/ (Omnidex-derived) — see
 * docs/CALCULATIONS.md and pipeline/src/shoutatyourdecks/README.md.
 */
export async function runAnalytics(): Promise<void> {
  const allRecords = await listCachedDecks();
  const keptSummaries: ShoutAtYourDecksDeckSummary[] = [];
  const keptDecksWithLists: ShoutAtYourDecksDeck[] = [];

  for (const record of allRecords) {
    if (!record.summary || !shouldKeepDeck(record.summary)) continue;
    keptSummaries.push(record.summary);
    if (record.deck) keptDecksWithLists.push(record.deck);
  }

  console.log(
    `shoutatyourdecks: computing analytics over ${keptSummaries.length} filtered decks (${keptDecksWithLists.length} with full decklists so far)`,
  );

  const catalog = await loadCardCatalog();
  const cardIndex = buildCardIndex(catalog);

  const cardInclusion = computeCardInclusion(keptDecksWithLists, cardIndex);
  const popularity = computePopularity(keptSummaries, keptDecksWithLists, cardIndex);
  const priceDistribution = computePriceDistribution(keptSummaries);
  const archetypes = computeArchetypeClustering(keptDecksWithLists);
  const deckEra = computeDeckEra(keptDecksWithLists, cardIndex);
  const coOccurrence = computeCoOccurrence(keptDecksWithLists, cardIndex);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "card-inclusion.json"), JSON.stringify(cardInclusion), "utf-8");
  await writeFile(path.join(DATA_DIR, "popularity.json"), JSON.stringify(popularity), "utf-8");
  await writeFile(path.join(DATA_DIR, "price-distribution.json"), JSON.stringify(priceDistribution), "utf-8");
  await writeFile(path.join(DATA_DIR, "archetypes.json"), JSON.stringify(archetypes), "utf-8");
  await writeFile(path.join(DATA_DIR, "deck-era.json"), JSON.stringify(deckEra), "utf-8");
  await writeFile(path.join(DATA_DIR, "co-occurrence.json"), JSON.stringify(coOccurrence), "utf-8");

  console.log(
    `shoutatyourdecks: analytics published — ${cardInclusion.overall.length} distinct cards, ` +
      `${popularity.champion.length} champions, ${archetypes.clusters.length} archetype clusters, ` +
      `${deckEra.buckets.length} era buckets, ${Object.keys(coOccurrence.byChampion).length} champions with co-occurrence data`,
  );
}
