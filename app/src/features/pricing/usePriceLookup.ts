import { useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PriceData } from "@gatcg/shared";
import { db, type PriceRow } from "../../lib/db";

async function refreshPrices(): Promise<void> {
  const res = await fetch("/data/prices.json");
  if (!res.ok) return; // pipeline hasn't published data yet (e.g. fresh clone before first CI run)

  const data = (await res.json()) as PriceData;
  const meta = await db.syncMeta.get("prices");
  if (meta?.cursor === data.generatedAt) return; // already have this exact generation

  const rows: PriceRow[] = Object.entries(data.prices).map(([key, entry]) => ({ key, ...entry }));
  await db.prices.bulkPut(rows);
  await db.syncMeta.put({ key: "prices", lastSyncedAt: new Date().toISOString(), cursor: data.generatedAt });
}

/** Cached in Dexie (keyed by `priceKey`); refreshes from the pipeline's published data/prices.json in the background. */
export function usePriceLookup(): Map<string, PriceRow> {
  useEffect(() => {
    refreshPrices().catch((err: unknown) => console.error("failed to refresh prices", err));
  }, []);

  const rows = useLiveQuery(() => db.prices.toArray(), [], []) ?? [];
  return useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
}
