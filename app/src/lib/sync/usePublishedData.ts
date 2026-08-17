import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

interface Generated {
  generatedAt: string;
}

async function refresh(key: string, url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) return; // pipeline hasn't published this dataset yet

  const data = (await res.json()) as Generated;
  const existing = await db.published.get(key);
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
