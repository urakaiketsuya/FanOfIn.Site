import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

interface Generated {
  generatedAt: string;
}

let manifestPromise: Promise<Record<string, string>> | null = null;

/**
 * Fetched once per page load and cached at module scope — a tiny (~1KB) map of every published
 * dataset's key to its current `generatedAt`. Checked before deciding whether to fetch a real
 * dataset file, some of which are 90MB+. Falls back to `{}` on any failure (offline, or the
 * pipeline hasn't published a manifest yet), which just makes `refresh` behave as it did before
 * this existed — always fetch and compare after the fact.
 */
function loadManifest(): Promise<Record<string, string>> {
  if (!manifestPromise) {
    manifestPromise = fetch("/data/manifest.json")
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

const inFlightRefreshes = new Map<string, Promise<void>>();

async function doRefresh(key: string, url: string): Promise<void> {
  const existing = await db.published.get(key);
  const manifest = await loadManifest();

  // The whole point of the manifest: if it confirms we already have the current generation
  // cached, skip fetching (and JSON-parsing) the real file entirely. Without this, every mount of
  // a hook using a large dataset re-downloaded and re-parsed the whole thing even when nothing had
  // changed since the last visit — deck-card-index.json alone is 93MB.
  if (manifest[key] && existing?.generatedAt === manifest[key]) return;

  const res = await fetch(url);
  if (!res.ok) return; // pipeline hasn't published this dataset yet

  const data = (await res.json()) as Generated;
  if (existing?.generatedAt === data.generatedAt) return; // already have this exact generation

  await db.published.put({ key, generatedAt: data.generatedAt, data });
}

/**
 * Multiple hook call sites can mount in the same tick and all want the same key (e.g. `/decks`
 * mounts `useDeckPopularity` and `useCardCombination`, which both pull `deck-card-index.json` —
 * a 90MB+ dataset) — without this, each one raced its own independent fetch+JSON.parse of the
 * same huge file before any had a chance to write the IndexedDB cache the others check. Harmless
 * waste on desktop; on mobile, several concurrent multi-hundred-MB in-memory parses is enough
 * memory pressure that Safari would silently kill and reload the tab, which is exactly what this
 * fixes. One in-flight promise per key, shared by every concurrent caller.
 */
function refresh(key: string, url: string): Promise<void> {
  let inFlight = inFlightRefreshes.get(key);
  if (!inFlight) {
    inFlight = doRefresh(key, url).finally(() => inFlightRefreshes.delete(key));
    inFlightRefreshes.set(key, inFlight);
  }
  return inFlight;
}

/**
 * Fetch-if-stale + IndexedDB cache for a pipeline-published dataset (data/omnidex/*.json,
 * data/analysis/*.json). Each dataset carries its own `generatedAt`, so a refresh is a cheap
 * no-op once the cached copy matches what's currently published. Same pattern as usePriceLookup.
 */
export function usePublishedData<T extends Generated>(key: string, url: string): T | undefined {
  useEffect(() => {
    refresh(key, url).catch((err: unknown) => console.error(`failed to refresh ${key}`, err));
  }, [key, url]);

  const row = useLiveQuery(() => db.published.get(key), [key]);
  return row?.data as T | undefined;
}
