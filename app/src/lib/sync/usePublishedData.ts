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

async function refresh(key: string, url: string): Promise<void> {
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
