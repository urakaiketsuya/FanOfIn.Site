import { readFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/shoutatyourdecks");
const DECKS_DIR = path.join(CACHE_DIR, "decks");
const HARVEST_META_PATH = path.join(CACHE_DIR, "harvest-meta.json");
const PROGRESS_PATH = path.join(CACHE_DIR, "progress.json");
const PUBLISHED_DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/shoutatyourdecks");

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

/**
 * Seeds the local fetch cache from the already-committed data/shoutatyourdecks/ output. Without
 * this, a cache-cold run — the very first CI run of this workflow, or any run after GitHub Actions
 * evicts the actions/cache entry (7 days unused, or size pressure) — has no way to know which decks
 * were already fetched, so it redoes the full ~21k-deck crawl instead of an incremental one (the
 * workflow's inline reasoning about "metadata/decklists both skip anything already cached" assumes
 * a warm cache that doesn't actually exist yet in that scenario).
 *
 * Only recovers decks that passed the publish filter — data/ never holds filtered-out decks, so
 * those just get their (cheap, HTTP-only) metadata re-fetched and re-filtered, which is fine; the
 * expensive phase this protects is the browser-driven decklist fetch.
 */
export async function hydrateCacheFromPublishedData(): Promise<{ hydrated: number }> {
  let index: { decks: ShoutAtYourDecksDeckSummary[] };
  try {
    index = JSON.parse(await readFile(path.join(PUBLISHED_DATA_DIR, "index.json"), "utf-8"));
  } catch {
    return { hydrated: 0 };
  }

  let hydrated = 0;
  for (const summary of index.decks) {
    if (await readCachedDeck(summary.id)) continue; // already known to the local cache, nothing to recover

    let deck: ShoutAtYourDecksDeck | null = null;
    try {
      deck = JSON.parse(await readFile(path.join(PUBLISHED_DATA_DIR, "decks", `${summary.id}.json`), "utf-8"));
    } catch {
      // decklist not published yet for this (kept) deck — the summary alone still saves the metadata fetch
    }

    await writeCachedDeck({ id: summary.id, url: summary.url, summary, deck });
    hydrated++;
  }
  return { hydrated };
}
