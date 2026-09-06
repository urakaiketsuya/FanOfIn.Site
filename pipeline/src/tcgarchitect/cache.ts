import { readFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { TcgArchitectDeck } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/tcgarchitect");
const DECKS_DIR = path.join(CACHE_DIR, "decks");
const HARVEST_META_PATH = path.join(CACHE_DIR, "harvest-meta.json");
const PUBLISHED_DECKS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/tcgarchitect/decks");

export interface CachedTcgArchitectDeckRecord {
  id: string;
  deck: TcgArchitectDeck;
}

export interface TcgArchitectHarvestMeta {
  /** Last full page successfully processed — a re-run always restarts at page 1 (the listing is
   * newest-first, see client.ts), so this is informational/progress-visibility only, same as
   * ShoutAtYourDecks' harvest-meta.json. */
  lastPageHarvested: number;
  deckCount: number;
  updatedAt: string;
}

async function ensureDirs(): Promise<void> {
  await mkdir(DECKS_DIR, { recursive: true });
}

function deckPath(id: string): string {
  return path.join(DECKS_DIR, `${id}.json`);
}

export async function readCachedTcgArchitectDeck(id: string): Promise<CachedTcgArchitectDeckRecord | null> {
  try {
    return JSON.parse(await readFile(deckPath(id), "utf-8")) as CachedTcgArchitectDeckRecord;
  } catch {
    return null;
  }
}

export async function writeCachedTcgArchitectDeck(record: CachedTcgArchitectDeckRecord): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(deckPath(record.id), record);
}

export async function listCachedTcgArchitectDecks(): Promise<CachedTcgArchitectDeckRecord[]> {
  let files: string[] = [];
  try {
    files = await readdir(DECKS_DIR);
  } catch {
    return [];
  }
  const records: CachedTcgArchitectDeckRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const record = await readCachedTcgArchitectDeck(file.slice(0, -".json".length));
    if (record) records.push(record);
  }
  return records;
}

/**
 * Reads the committed/published TcgArchitect deck copies. GitHub Actions restores `pipeline/.cache`,
 * but the daily community blend (`pipeline/src/community/blend.ts`) runs in a separate job/cache
 * scope from `tcgarchitect-refresh.yml`'s own harvest — same reasoning as Sleeved's
 * `listPublishedSleevedDecks`, see that function's doc comment. The blend uses this as a fallback
 * so a cold local cache can't silently republish a two-source-only population.
 */
export async function listPublishedTcgArchitectDecks(publishedDecksDir = PUBLISHED_DECKS_DIR): Promise<CachedTcgArchitectDeckRecord[]> {
  let files: string[] = [];
  try {
    files = await readdir(publishedDecksDir);
  } catch {
    return [];
  }
  const records: CachedTcgArchitectDeckRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const deck = JSON.parse(await readFile(path.join(publishedDecksDir, file), "utf-8")) as TcgArchitectDeck;
      records.push({ id: deck.id, deck });
    } catch {
      // One malformed published file should not make every other usable deck disappear.
    }
  }
  return records;
}

export async function writeTcgArchitectHarvestMeta(meta: TcgArchitectHarvestMeta): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(HARVEST_META_PATH, meta);
}
