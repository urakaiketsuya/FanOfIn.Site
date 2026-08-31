import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { TcgArchitectDeckSummary } from "@gatcg/shared";
import { listCachedTcgArchitectDecks } from "./cache.js";
import { shouldKeepTcgArchitectDeck } from "./filter.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/tcgarchitect");

export interface TcgArchitectIndex {
  generatedAt: string;
  decks: TcgArchitectDeckSummary[];
}

/** Pure local transform: reads whatever's in the raw cache (populated by run.ts's harvest) and
 * re-applies the filter before publishing — defensive against the filter's threshold having
 * changed since some cache entries were written. A re-publish never needs to touch the network,
 * same as ShoutAtYourDecks' build.ts. */
export async function buildTcgArchitectIndex(): Promise<TcgArchitectIndex> {
  const allRecords = await listCachedTcgArchitectDecks();
  const decks: TcgArchitectDeckSummary[] = [];

  for (const record of allRecords) {
    if (!shouldKeepTcgArchitectDeck(record.deck)) continue;
    const { materialDeck, mainDeck, sideDeck, pantheonDeck, ...summary } = record.deck;
    decks.push(summary);
  }

  decks.sort((a, b) => a.title.localeCompare(b.title));

  return { generatedAt: new Date().toISOString(), decks };
}

export async function writeTcgArchitectData(index: TcgArchitectIndex): Promise<void> {
  const decksOutDir = path.join(DATA_DIR, "decks");
  await mkdir(decksOutDir, { recursive: true });
  await writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index), "utf-8");

  const allRecords = await listCachedTcgArchitectDecks();
  const recordsById = new Map(allRecords.map((r) => [r.id, r]));
  let decklistsPublished = 0;
  for (const summary of index.decks) {
    const record = recordsById.get(summary.id);
    if (record) {
      await writeFile(path.join(decksOutDir, `${summary.id}.json`), JSON.stringify(record.deck), "utf-8");
      decklistsPublished++;
    }
  }
  console.log(`tcgarchitect: published ${index.decks.length} decks (${decklistsPublished} with full decklists)`);
}
