import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { listCachedDecks } from "./cache.js";
import { shouldKeepDeck } from "./filter.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/shoutatyourdecks");

export interface ShoutAtYourDecksIndex {
  generatedAt: string;
  decks: ShoutAtYourDecksDeckSummary[];
}

/**
 * Pure local transform: reads whatever's in the raw cache (populated by harvest.ts/metadataFetch.ts/
 * decklistFetch.ts) and re-applies the filter before publishing — defensive against the filter's
 * thresholds having changed since some cache entries were written. A re-publish never needs to
 * touch the network. Standalone dataset (see README) — not wired into the Omnidex-derived
 * analysis pipeline yet.
 */
export async function buildShoutAtYourDecksIndex(): Promise<ShoutAtYourDecksIndex> {
  const allRecords = await listCachedDecks();
  const decks: ShoutAtYourDecksDeckSummary[] = [];

  for (const record of allRecords) {
    if (!record.summary) continue;
    if (!shouldKeepDeck(record.summary)) continue;
    decks.push(record.summary);
  }

  decks.sort((a, b) => a.title.localeCompare(b.title));

  return { generatedAt: new Date().toISOString(), decks };
}

export async function writeShoutAtYourDecksData(index: ShoutAtYourDecksIndex): Promise<void> {
  const decksOutDir = path.join(DATA_DIR, "decks");
  await mkdir(decksOutDir, { recursive: true });
  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index), "utf-8");

  const allRecords = await listCachedDecks();
  const recordsById = new Map(allRecords.map((r) => [r.id, r]));
  let decklistsPublished = 0;
  for (const summary of index.decks) {
    const record = recordsById.get(summary.id);
    if (record?.deck) {
      await writeFile(path.join(decksOutDir, `${summary.id}.json`), JSON.stringify(record.deck), "utf-8");
      decklistsPublished++;
    }
  }
  console.log(`shoutatyourdecks: published ${index.decks.length} decks (${decklistsPublished} with full decklists)`);
}
