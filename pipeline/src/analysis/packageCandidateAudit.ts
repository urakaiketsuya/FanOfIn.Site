import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { namedRulesTextSeeds, subtypeRulesTextSeeds, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityIndexData } from "@gatcg/shared";
import { archetypeOverlapSeeds, computePackageCandidates } from "./packageCandidates.js";
import { writeManifest } from "../manifest.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

async function main() {
  const [deckIndex, popularity, taxonomy, cachedCards] = await Promise.all([
    readFile(path.join(ROOT, "data/analysis/deck-card-index.json"), "utf8").then((text) => JSON.parse(text) as DeckCardIndexData),
    readFile(path.join(ROOT, "data/analysis/deck-popularity-index.json"), "utf8").then((text) => JSON.parse(text) as DeckPopularityIndexData),
    readFile(path.join(ROOT, "data/analysis/archetype-taxonomy.json"), "utf8").then((text) => JSON.parse(text) as ArchetypeTaxonomyData),
    readFile(path.join(ROOT, "pipeline/.cache/cards.json"), "utf8").then((text) => JSON.parse(text) as { cards: { name: string; types?: string[]; subtypes?: string[]; effect?: string | null }[] }),
  ]);
  const result = computePackageCandidates(
    deckIndex.decks,
    deckIndex.cardNames,
    new Map(popularity.entries.flatMap((entry) => entry.championName ? [[entry.deckId, entry.championName] as const] : [])),
    [...namedRulesTextSeeds(cachedCards.cards), ...subtypeRulesTextSeeds(cachedCards.cards), ...archetypeOverlapSeeds(taxonomy.clusters)],
  );
  await writeFile(path.join(ROOT, "data/analysis/package-candidates.json"), JSON.stringify(result), "utf8");
  await writeManifest();
  console.log(`package candidate audit: ${result.candidates.length} candidates and ${result.families.length} overlapping families`);
}

await main();
