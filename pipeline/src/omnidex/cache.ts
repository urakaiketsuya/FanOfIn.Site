import { retainPublishedPairings } from "./stagePairings.js";
import { writeJsonAtomic } from "../lib/atomicWrite.js";
import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type {
  OmnidexApiError,
  OmnidexDecklistEntry,
  OmnidexEvent,
  OmnidexIndexData,
  OmnidexJudge,
  OmnidexPairingsResponse,
  OmnidexPlayer,
  OmnidexStandingsResponse,
  OmnidexTeamsResponse,
} from "@gatcg/shared";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/omnidex");
const EVENTS_DIR = path.join(CACHE_DIR, "events");
const META_PATH = path.join(CACHE_DIR, "meta.json");
/** Published event snapshots seed fresh caches and preserve pairing repairs missing from restored automation caches. */
const PUBLISHED_DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex");
const PUBLISHED_EVENTS_DIR = path.join(PUBLISHED_DATA_DIR, "events");
const PUBLISHED_INDEX_PATH = path.join(PUBLISHED_DATA_DIR, "index.json");

export interface OmnidexEventBundle {
  id: number;
  event: OmnidexEvent;
  players: OmnidexPlayer[];
  standings: OmnidexStandingsResponse | OmnidexApiError;
  pairingsByRound: (OmnidexPairingsResponse | OmnidexApiError)[];
  judges: OmnidexJudge[] | OmnidexApiError;
  teams: OmnidexTeamsResponse | OmnidexApiError;
  decklists: OmnidexDecklistEntry[] | OmnidexApiError;
  statistics: unknown | OmnidexApiError;
  fetchedAt: string;
}

export interface CrawlMeta {
  maxKnownId: number;
  backfilledYears: number[];
  lastRunAt: string;
}

export { EVENTS_DIR };

async function ensureDirs(): Promise<void> {
  await mkdir(EVENTS_DIR, { recursive: true });
}

export async function readMeta(): Promise<CrawlMeta | null> {
  try {
    return JSON.parse(await readFile(META_PATH, "utf-8")) as CrawlMeta;
  } catch {
    return null;
  }
}

export async function writeMeta(meta: CrawlMeta): Promise<void> {
  await ensureDirs();
  await writeFile(META_PATH, JSON.stringify(meta, null, 2), "utf-8");
}

export interface CrawlProgress {
  scanned: number;
  deepFetched: number;
  currentId: number;
  rangeStartId: number;
  rangeEndId: number;
  updatedAt: string;
}

const PROGRESS_PATH = path.join(CACHE_DIR, "progress.json");

/**
 * A disk-based heartbeat, separate from `meta.json` (which only records a *complete* run's
 * result). Long crawls can run for a long time with console output fully buffered through
 * npm/tsx's process chain when redirected to a file, so this is the reliable way to check
 * whether a background run is actually making progress.
 */
export async function writeProgress(progress: CrawlProgress): Promise<void> {
  await ensureDirs();
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf-8");
}

export async function readProgress(): Promise<CrawlProgress | null> {
  try {
    return JSON.parse(await readFile(PROGRESS_PATH, "utf-8")) as CrawlProgress;
  } catch {
    return null;
  }
}

function bundlePath(id: number): string {
  return path.join(EVENTS_DIR, `${id}.json`);
}

interface SnapshotDirectories { cache: string; published: string }
const snapshotDirectories: SnapshotDirectories = { cache: EVENTS_DIR, published: PUBLISHED_EVENTS_DIR };

export async function readCachedBundle(id: number, directories = snapshotDirectories): Promise<OmnidexEventBundle | null> {
  async function read(directory: string): Promise<OmnidexEventBundle | null> {
    try { return JSON.parse(await readFile(path.join(directory, `${id}.json`), 'utf8')) as OmnidexEventBundle; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  const [cached, published] = await Promise.all([read(directories.cache), read(directories.published)]);
  if (!cached) return published;
  if (!published) return cached;
  const [latest, previous] = published.fetchedAt > cached.fetchedAt ? [published, cached] : [cached, published];
  return { ...latest, pairingsByRound: retainPublishedPairings(latest.pairingsByRound, previous.pairingsByRound) };
}

export async function writeCachedBundle(bundle: OmnidexEventBundle): Promise<void> {
  await ensureDirs();
  await writeJsonAtomic(bundlePath(bundle.id), bundle, 0);
}

/** Read the union so a restored automation cache cannot erase published backfills. */
export async function listCachedBundles(directories = snapshotDirectories): Promise<OmnidexEventBundle[]> {
  async function files(directory: string): Promise<string[]> {
    try { return await readdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  }
  const paths = await Promise.all([files(directories.cache), files(directories.published)]);
  const ids = [...new Set(paths.flat().filter(file => /^\d+\.json$/.test(file)).map(file => Number(file.slice(0, -5))))].sort((a, b) => a - b);
  const bundles: OmnidexEventBundle[] = [];
  for (const id of ids) {
    const bundle = await readCachedBundle(id, directories);
    if (bundle) bundles.push(bundle);
  }
  return bundles;
}

/**
 * Bootstraps a fresh checkout's crawl cache from the already-published `data/omnidex/` instead of
 * re-fetching everything from Omnidex — a brand-new machine/session otherwise has no cache, so its
 * first "incremental" crawl falls back to scanning a full year of ids with a live API call per id
 * (see `crawlEvents`'s `startId` fallback). Only runs when the local cache is genuinely empty (zero
 * files in EVENTS_DIR) — any existing entry, even one, skips this entirely, so a real in-progress
 * local crawl's state is never touched or merged with. No-ops quietly if `data/omnidex/events/`
 * itself doesn't exist (e.g. a minimal checkout without the data directory).
 *
 * `meta.json`'s seeded `maxKnownId` is a conservative underestimate — the published index only
 * covers deep-fetched ("substantial") events, not every id that was ever scanned and skipped — so
 * the next incremental crawl re-scans a bounded gap near the frontier rather than picking up
 * exactly where the original machine left off. `meta.json` self-corrects once that crawl finishes.
 */
export async function seedCacheFromPublished(): Promise<void> {
  let existing: string[] = [];
  try {
    existing = await readdir(EVENTS_DIR);
  } catch {
    // EVENTS_DIR doesn't exist yet — treat the same as empty.
  }
  if (existing.length > 0) return;

  let publishedFiles: string[] = [];
  try {
    publishedFiles = (await readdir(PUBLISHED_EVENTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return; // no published data/omnidex/events/ to seed from — fall through to a normal crawl.
  }
  if (publishedFiles.length === 0) return;

  await ensureDirs();
  for (const file of publishedFiles) {
    await copyFile(path.join(PUBLISHED_EVENTS_DIR, file), path.join(EVENTS_DIR, file));
  }

  const priorMeta = await readMeta();
  if (!priorMeta) {
    let maxKnownId = 0;
    try {
      const index = JSON.parse(await readFile(PUBLISHED_INDEX_PATH, "utf-8")) as OmnidexIndexData;
      maxKnownId = index.events.reduce((max, e) => Math.max(max, e.id), 0);
    } catch {
      // No published index.json — leave maxKnownId at 0; the crawl falls back to its own
      // year-start logic, same as if nothing had been seeded at all.
    }
    if (maxKnownId > 0) {
      await writeMeta({ maxKnownId, backfilledYears: [], lastRunAt: new Date().toISOString() });
    }
  }

  console.log(`omnidex: seeded ${publishedFiles.length} cached events from published data/ (first run on this machine)`);
}
