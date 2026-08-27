import { readFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SleevedDeck } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/sleeved");
const DECKS_DIR = path.join(CACHE_DIR, "decks");
const HARVEST_META_PATH = path.join(CACHE_DIR, "harvest-meta.json");
const PUBLISHED_DECKS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/sleeved/decks");

/**
 * Simpler than ShoutAtYourDecks' `CachedDeckRecord` — Sleeved has no separate cheap-metadata phase
 * (see client.ts's doc comment), so a cache entry is either just a known id awaiting its
 * bulk-details fetch (`deck: null`), or fully populated in one step.
 */
export interface CachedSleevedDeckRecord {
  id: string;
  deck: SleevedDeck | null;
}

export interface SleevedHarvestMeta {
  knownDeckIds: string[];
  updatedAt: string;
}

async function ensureDirs(): Promise<void> {
  await mkdir(DECKS_DIR, { recursive: true });
}

function deckPath(id: string): string {
  return path.join(DECKS_DIR, `${id}.json`);
}

export async function readCachedSleevedDeck(id: string): Promise<CachedSleevedDeckRecord | null> {
  try {
    return JSON.parse(await readFile(deckPath(id), "utf-8")) as CachedSleevedDeckRecord;
  } catch {
    return null;
  }
}

export async function writeCachedSleevedDeck(record: CachedSleevedDeckRecord): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(deckPath(record.id), record);
}

export async function listCachedSleevedDecks(): Promise<CachedSleevedDeckRecord[]> {
  let files: string[] = [];
  try {
    files = await readdir(DECKS_DIR);
  } catch {
    return [];
  }
  const records: CachedSleevedDeckRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const record = await readCachedSleevedDeck(file.slice(0, -".json".length));
    if (record) records.push(record);
  }
  return records;
}

/**
 * Reads the committed/published Sleeved deck copies. GitHub Actions restores `pipeline/.cache`,
 * but a cache created before the Sleeved integration has no Sleeved entries and the normal daily
 * pipeline intentionally does not call the authenticated Sleeved API. The community blend uses
 * this as a fallback so a cache miss cannot silently republish ShoutAtYourDecks-only aggregates.
 * `publishedDecksDir` is injectable for the focused filesystem test.
 */
export async function listPublishedSleevedDecks(publishedDecksDir = PUBLISHED_DECKS_DIR): Promise<CachedSleevedDeckRecord[]> {
  let files: string[] = [];
  try {
    files = await readdir(publishedDecksDir);
  } catch {
    return [];
  }
  const records: CachedSleevedDeckRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const deck = JSON.parse(await readFile(path.join(publishedDecksDir, file), "utf-8")) as SleevedDeck;
      records.push({ id: deck.id, deck });
    } catch {
      // One malformed published file should not make every other usable deck disappear.
    }
  }
  return records;
}

export async function readSleevedHarvestMeta(): Promise<SleevedHarvestMeta | null> {
  try {
    return JSON.parse(await readFile(HARVEST_META_PATH, "utf-8")) as SleevedHarvestMeta;
  } catch {
    return null;
  }
}

export async function writeSleevedHarvestMeta(meta: SleevedHarvestMeta): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(HARVEST_META_PATH, meta);
}
