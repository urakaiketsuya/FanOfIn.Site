import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CommunityFormatSummaryData, DeckFormat, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { loadCardCatalog, buildCardIndex } from "../../cards/catalog.js";
import { listCachedDecks } from "../cache.js";
import { shouldKeepDeck } from "../filter.js";
import { computeCardInclusion } from "./cardInclusion.js";
import { computePopularity } from "./popularity.js";
import { computePriceDistribution } from "./priceDistribution.js";
import { computeArchetypeClustering } from "./archetypeClustering.js";
import { computeDeckEra } from "./deckEra.js";
import { computeCoOccurrence } from "./coOccurrence.js";
import { computeCardDeckReferences } from "./deckReferences.js";
import { withClassifiedFormat } from "../format.js";

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
    const summary = withClassifiedFormat(record.summary, record.deck);
    keptSummaries.push(summary);
    if (record.deck) keptDecksWithLists.push({ ...record.deck, format: summary.format, formatConfidence: summary.formatConfidence });
  }

  console.log(
    `shoutatyourdecks: computing analytics over ${keptSummaries.length} filtered decks (${keptDecksWithLists.length} with full decklists so far)`,
  );

  const catalog = await loadCardCatalog();
  const cardIndex = buildCardIndex(catalog);

  await mkdir(DATA_DIR, { recursive: true });
  const counts = { STANDARD: 0, PANTHEON: 0, UNKNOWN: 0 } satisfies Record<DeckFormat, number>;
  const confirmedCounts = { ...counts };
  const inferredCounts = { ...counts };
  for (const summary of keptSummaries) {
    const format = summary.format ?? "UNKNOWN";
    counts[format]++;
    if (summary.formatConfidence === "declared") confirmedCounts[format]++;
    if (summary.formatConfidence === "inferred") inferredCounts[format]++;
  }
  const formatSummary: CommunityFormatSummaryData = { generatedAt: new Date().toISOString(), counts, confirmedCounts, inferredCounts };
  await writeFile(path.join(DATA_DIR, "format-summary.json"), JSON.stringify(formatSummary), "utf-8");

  for (const format of ["STANDARD", "PANTHEON"] as const) {
    const summaries = keptSummaries.filter((deck) => deck.format === format);
    const decks = keptDecksWithLists.filter((deck) => deck.format === format);
    const cardInclusion = computeCardInclusion(decks, cardIndex);
    const popularity = computePopularity(summaries, decks, cardIndex);
    const priceDistribution = computePriceDistribution(summaries);
    const archetypes = computeArchetypeClustering(decks, format === "PANTHEON" ? "fuzzy" : "exact");
    const deckEra = computeDeckEra(decks, cardIndex);
    const coOccurrence = computeCoOccurrence(decks, cardIndex);
    const deckReferences = computeCardDeckReferences(decks, cardIndex);
    const dir = format === "STANDARD" ? DATA_DIR : path.join(DATA_DIR, "pantheon");
    await mkdir(dir, { recursive: true });
    await Promise.all([
      ...(format === "PANTHEON" ? [writeFile(path.join(dir, "decks.json"), JSON.stringify({ generatedAt: new Date().toISOString(), decks: summaries.map((summary) => {
        const deck = decks.find((candidate) => candidate.id === summary.id);
        return { ...summary, cardNames: deck ? Array.from(new Set([...deck.mainDeck, ...deck.materialDeck, ...deck.sideDeck].map((line) => line.name))) : [], boonNames: deck?.pantheonDeck?.map((line) => line.name) ?? [] };
      }) }), "utf-8")] : []),
      writeFile(path.join(dir, "card-inclusion.json"), JSON.stringify(cardInclusion), "utf-8"),
      writeFile(path.join(dir, "popularity.json"), JSON.stringify(popularity), "utf-8"),
      writeFile(path.join(dir, "price-distribution.json"), JSON.stringify(priceDistribution), "utf-8"),
      writeFile(path.join(dir, "archetypes.json"), JSON.stringify(archetypes), "utf-8"),
      writeFile(path.join(dir, "deck-era.json"), JSON.stringify(deckEra), "utf-8"),
      writeFile(path.join(dir, "co-occurrence.json"), JSON.stringify(coOccurrence), "utf-8"),
      writeFile(path.join(dir, "deck-references.json"), JSON.stringify(deckReferences), "utf-8"),
    ]);
    console.log(`shoutatyourdecks: ${format.toLowerCase()} — ${decks.length} lists, ${cardInclusion.overall.length} cards, ${archetypes.clusters.length} strategy clusters`);
  }
}
