import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PriceData } from "@gatcg/shared";
import { db, type PriceRow } from "../../lib/db";

async function refreshPrices(): Promise<void> {
  const res = await fetch("/data/prices.json");
  if (!res.ok) throw new Error("Prices are currently unavailable.");

  const data = (await res.json()) as PriceData;
  const meta = await db.syncMeta.get("prices");
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
  const cached = useLiveQuery(async () => enabled ? db.transaction("r", db.prices, db.syncMeta, async () => ({
    rows: await db.prices.toArray(), updatedAt: (await db.syncMeta.get("prices"))?.cursor,
  })) : undefined, [enabled]);
  const prices = useMemo(() => new Map((cached?.rows ?? []).map(row => [row.key, row])), [cached]);
  return { prices, updatedAt: cached?.updatedAt ?? undefined, loading, error, retry };
}

/** Cached in Dexie; refreshes from the pipeline's published data in the background. */
export function usePriceLookup(enabled = true): Map<string, PriceRow> {
  return usePriceLookupState(enabled).prices;
}
