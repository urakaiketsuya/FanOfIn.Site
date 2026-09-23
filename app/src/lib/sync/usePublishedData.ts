import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PublishedDataRow } from "../db";
import { beginLoading, endLoading } from "../useGlobalLoading";

interface Generated {
  generatedAt: string;
}

/** Sentinel for `useLiveQuery`'s `defaultResult` — the value it returns until the first IndexedDB read resolves. */
const PENDING = Symbol("published-data-pending");

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
type RefreshStatus = { phase: "idle" | "loading" | "ready" | "error"; error: string | null };
const IDLE_REFRESH_STATUS: RefreshStatus = { phase: "idle", error: null };
const refreshStatuses = new Map<string, RefreshStatus>();
const refreshListeners = new Map<string, Set<() => void>>();

function setRefreshStatus(key: string, status: RefreshStatus): void {
  refreshStatuses.set(key, status);
  for (const listener of refreshListeners.get(key) ?? []) listener();
}

async function doRefresh(key: string, url: string): Promise<void> {
  const existing = await db.published.get(key);
  const manifest = await loadManifest();

  // The whole point of the manifest: if it confirms we already have the current generation
  // cached, skip fetching (and JSON-parsing) the real file entirely. Without this, every mount of
  // a hook using a large dataset re-downloaded and re-parsed the whole thing even when nothing had
  // changed since the last visit — deck-card-index.json alone is 93MB.
  if (manifest[key] && existing?.generatedAt === manifest[key]) return;

  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? "This dataset has not been published yet." : `Request failed (${res.status}).`);

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
    setRefreshStatus(key, { phase: "loading", error: null });
    inFlight = doRefresh(key, url)
      .then(() => setRefreshStatus(key, { phase: "ready", error: null }))
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : "The published dataset could not be loaded.";
        setRefreshStatus(key, { phase: "error", error: message });
        throw reason;
      })
      .finally(() => inFlightRefreshes.delete(key));
    inFlightRefreshes.set(key, inFlight);
  }
  return inFlight;
}

/** Network refresh state for a published dataset. Pair with `usePublishedData` when a surface
 * must distinguish a slow first load from an absent/failed dataset instead of rendering both as
 * an empty result. Cached data remains usable while a background refresh fails. */
export function usePublishedDataStatus(key: string, url: string, enabled = true): RefreshStatus & { retry: () => void } {
  const subscribe = useCallback((listener: () => void) => {
    let listeners = refreshListeners.get(key);
    if (!listeners) refreshListeners.set(key, listeners = new Set());
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) refreshListeners.delete(key);
    };
  }, [key]);
  const getSnapshot = useCallback(() => refreshStatuses.get(key) ?? IDLE_REFRESH_STATUS, [key]);
  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const retry = useCallback(() => {
    if (!enabled) return;
    void refresh(key, url).catch((err: unknown) => console.error(`failed to refresh ${key}`, err));
  }, [enabled, key, url]);
  return { ...status, retry };
}

/**
 * Fetch-if-stale + IndexedDB cache for a pipeline-published dataset (data/omnidex/*.json,
 * data/analysis/*.json). Each dataset carries its own `generatedAt`, so a refresh is a cheap
 * no-op once the cached copy matches what's currently published. Same pattern as usePriceLookup.
 */
export function usePublishedData<T extends Generated>(key: string, url: string, enabled = true): T | undefined {
  useEffect(() => {
    if (!enabled) return;
    refresh(key, url).catch((err: unknown) => console.error(`failed to refresh ${key}`, err));
  }, [key, url, enabled]);

  // `useLiveQuery`'s defaultResult distinguishes "still resolving the IndexedDB read" from
  // "resolved to nothing" (the dataset is genuinely absent) — the latter must not keep the nav
  // progress bar spinning forever.
  const row = useLiveQuery(
    async (): Promise<PublishedDataRow | undefined> => enabled ? await db.published.get(key) : undefined,
    [key, enabled],
    PENDING as never,
  );
  const loading = enabled && (row as unknown) === PENDING;

  useEffect(() => {
    if (!loading) return;
    beginLoading();
    return endLoading;
  }, [loading]);

  return !enabled || loading ? undefined : (row?.data as T | undefined);
}
