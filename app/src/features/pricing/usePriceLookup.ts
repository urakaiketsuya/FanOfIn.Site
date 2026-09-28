import { useCallback, useEffect, useState } from "react";
import { createSharedLiveQuery } from "../../lib/sharedLiveQuery";
import { loadManifest } from "../../lib/sync/usePublishedData";
import type { PriceData } from "@gatcg/shared";
import { db, type PriceRow } from "../../lib/db";

async function refreshPrices(): Promise<void> {
  const meta = await db.syncMeta.get("prices");
  const manifest = await loadManifest();
  if (manifest.prices && meta?.cursor === manifest.prices) return;
  const res = await fetch("/data/prices.json");
  if (!res.ok) throw new Error("Prices are currently unavailable.");

  const data = (await res.json()) as PriceData;
  if (meta?.cursor === data.generatedAt) return; // already have this exact generation

  const rows: PriceRow[] = Object.entries(data.prices).map(([key, entry]) => ({ key, ...entry }));
  await db.transaction("rw", db.prices, db.syncMeta, async () => {
    await db.prices.clear();
    await db.prices.bulkPut(rows);
    await db.syncMeta.put({ key: "prices", lastSyncedAt: new Date().toISOString(), cursor: data.generatedAt });
  });
}

let inFlightPriceRefresh: Promise<void> | null = null;

function refreshPricesOnce(): Promise<void> {
  if (!inFlightPriceRefresh) {
    inFlightPriceRefresh = refreshPrices().finally(() => { inFlightPriceRefresh = null; });
  }
  return inFlightPriceRefresh;
}

const useCachedPrices = createSharedLiveQuery(async () => db.transaction("r", db.prices, db.syncMeta, async () => ({
  prices: new Map((await db.prices.toArray()).map(row => [row.key, row])),
  updatedAt: (await db.syncMeta.get("prices"))?.cursor ?? undefined,
})), {prices: new Map<string, PriceRow>(), updatedAt: undefined as string | undefined});

/** Cached quotes and refresh status, shared by collection and card pricing surfaces. */
export function usePriceLookupState(enabled = true) {
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const retry = useCallback(() => {
    if (!enabled) return;
    setLoading(true); setError(null);
    void refreshPricesOnce().catch(() => setError("Could not refresh prices.")).finally(() => setLoading(false));
  }, [enabled]);
  useEffect(retry, [retry]);
  const cached = useCachedPrices(enabled);
  return { ...cached, loading, error, retry };
}

/** Cached in Dexie; refreshes from the pipeline's published data in the background. */
export function usePriceLookup(enabled = true): Map<string, PriceRow> {
  return usePriceLookupState(enabled).prices;
}
