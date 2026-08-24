import { readFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/shoutatyourdecks");
const DECKS_DIR = path.join(CACHE_DIR, "decks");
const HARVEST_META_PATH = path.join(CACHE_DIR, "harvest-meta.json");
const PROGRESS_PATH = path.join(CACHE_DIR, "progress.json");

export { DECKS_DIR };

/**
 * A per-deck cache record, filled in incrementally across phases: harvest.ts creates it with just
 * `id`/`url` (+ list-view title/author), metadataFetch.ts fills in `summary`, decklistFetch.ts
 * fills in `deck` — only for decks that passed the filter. `deck` is absent for filtered-out decks
 * and for kept decks that haven't had their full decklist fetched yet.
 */
export interface CachedDeckRecord {
  id: string;
  url: string;
  summary: ShoutAtYourDecksDeckSummary | null;
  deck: ShoutAtYourDecksDeck | null;
}

export interface HarvestMeta {
  /** Listing pages are 1-indexed, 24 decks each (see harvest.ts) — the site's own MudPagination page count. */
  lastPageHarvested: number;
  totalPages: number | null;
  deckCount: number;
  updatedAt: string;
}

export interface CrawlProgress {
  phase: "harvest" | "metadata" | "decklists";
  completed: number;
  total: number;
  updatedAt: string;
}

async function ensureDirs(): Promise<void> {
  await mkdir(DECKS_DIR, { recursive: true });
}

function deckPath(id: string): string {
  return path.join(DECKS_DIR, `${id}.json`);
}

export async function readCachedDeck(id: string): Promise<CachedDeckRecord | null> {
  try {
    return JSON.parse(await readFile(deckPath(id), "utf-8")) as CachedDeckRecord;
  } catch {
    return null;
  }
}

export async function writeCachedDeck(record: CachedDeckRecord): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(deckPath(record.id), record);
}

export async function listCachedDecks(): Promise<CachedDeckRecord[]> {
  let files: string[] = [];
  try {
    files = await readdir(DECKS_DIR);
  } catch {
    return [];
  }
  const records: CachedDeckRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const record = await readCachedDeck(file.slice(0, -".json".length));
    if (record) records.push(record);
  }
  return records;
}

export async function readHarvestMeta(): Promise<HarvestMeta | null> {
  try {
    return JSON.parse(await readFile(HARVEST_META_PATH, "utf-8")) as HarvestMeta;
  } catch {
    return null;
  }
}

export async function writeHarvestMeta(meta: HarvestMeta): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(HARVEST_META_PATH, meta);
}

/** Disk-based heartbeat for long unattended runs — same rationale as omnidex/cache.ts's writeProgress. */
export async function writeProgress(progress: CrawlProgress): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(PROGRESS_PATH, progress);
}

export async function readProgress(): Promise<CrawlProgress | null> {
  try {
    return JSON.parse(await readFile(PROGRESS_PATH, "utf-8")) as CrawlProgress;
  } catch {
    return null;
  }
}
