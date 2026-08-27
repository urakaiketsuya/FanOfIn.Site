import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SleevedDeckSummary } from "@gatcg/shared";
import { listCachedSleevedDecks } from "./cache.js";
import { shouldKeepSleevedDeck } from "./filter.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/sleeved");

export interface SleevedIndex {
  generatedAt: string;
  decks: SleevedDeckSummary[];
}

/** Pure local transform, no network — same "safe to re-run anytime, re-applies the filter against
 * whatever's cached" shape as `shoutatyourdecks/build.ts`. */
export async function buildSleevedIndex(): Promise<SleevedIndex> {
  const allRecords = await listCachedSleevedDecks();
  const decks: SleevedDeckSummary[] = [];
  for (const record of allRecords) {
    if (!record.deck || !shouldKeepSleevedDeck(record.deck)) continue;
    decks.push(record.deck);
  }
  decks.sort((a, b) => a.title.localeCompare(b.title));
  return { generatedAt: new Date().toISOString(), decks };
}

export async function writeSleevedData(index: SleevedIndex): Promise<void> {
  const decksOutDir = path.join(DATA_DIR, "decks");
  await mkdir(decksOutDir, { recursive: true });
  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index), "utf-8");

  const allRecords = await listCachedSleevedDecks();
  const recordsById = new Map(allRecords.map((r) => [r.id, r]));
  let published = 0;
  for (const summary of index.decks) {
    const record = recordsById.get(summary.id);
    if (record?.deck) {
      await writeFile(path.join(decksOutDir, `${summary.id}.json`), JSON.stringify(record.deck), "utf-8");
      published++;
    }
  }
  console.log(`sleeved: published ${index.decks.length} decks (${published} with full decklists)`);
}
