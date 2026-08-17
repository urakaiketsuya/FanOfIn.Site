import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type {
  OmnidexApiError,
  OmnidexDecklistEntry,
  OmnidexEvent,
  OmnidexJudge,
  OmnidexPairingsResponse,
  OmnidexPlayer,
  OmnidexStandingsResponse,
} from "@gatcg/shared";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/omnidex");
const EVENTS_DIR = path.join(CACHE_DIR, "events");
const META_PATH = path.join(CACHE_DIR, "meta.json");

export interface OmnidexEventBundle {
  id: number;
  event: OmnidexEvent;
  players: OmnidexPlayer[];
  standings: OmnidexStandingsResponse | OmnidexApiError;
  pairingsByRound: (OmnidexPairingsResponse | OmnidexApiError)[];
  judges: OmnidexJudge[] | OmnidexApiError;
  teams: unknown | OmnidexApiError;
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

export async function readCachedBundle(id: number): Promise<OmnidexEventBundle | null> {
  try {
    return JSON.parse(await readFile(bundlePath(id), "utf-8")) as OmnidexEventBundle;
  } catch {
    return null;
  }
}

export async function writeCachedBundle(bundle: OmnidexEventBundle): Promise<void> {
  await ensureDirs();
  await writeFile(bundlePath(bundle.id), JSON.stringify(bundle), "utf-8");
}

/** Every cached bundle regardless of status — callers filter for `complete` as needed. */
export async function listCachedBundles(): Promise<OmnidexEventBundle[]> {
  let files: string[] = [];
  try {
    files = await readdir(EVENTS_DIR);
  } catch {
    return [];
  }
  const bundles: OmnidexEventBundle[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const bundle = await readCachedBundle(Number(file.slice(0, -".json".length)));
    if (bundle) bundles.push(bundle);
  }
  return bundles;
}
