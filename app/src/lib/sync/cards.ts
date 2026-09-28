import type { Card } from "@gatcg/shared";
import { gatcgApi } from "../api/client";
import { db } from "../db";

export interface SyncProgress {
  phase: "idle" | "syncing" | "done" | "error";
  fetched: number;
  total: number | null;
}

const PAGE_SIZE = 50;

/**
 * Bulk-syncs the full card catalog into IndexedDB on first run; on later runs
 * only fetches cards updated since the last sync's cursor. If a first sync is
 * starts with one published catalog request and an atomic cache write. An interruption
 * leaves the previous cursor intact; the next run retries safely. The API is a fallback.
 */
export async function syncCards(onProgress?: (progress: SyncProgress) => void): Promise<void> {
  let meta = await db.syncMeta.get("cards");
  if (!meta?.cursor) {
    onProgress?.({phase:"syncing",fetched:0,total:null});
    try {
      const response = await fetch("/data/card-catalog.json");
      if (response.ok) {
        const published = await response.json() as {generatedAt:string;cards:Card[]};
        if (!published.cards?.length || published.cards.some(card=>!card.uuid || !card.last_update || !Array.isArray(card.editions))) throw new Error("Incomplete published catalog");
        const cursor = published.cards.reduce((latest,card)=>card.last_update > latest ? card.last_update : latest, "");
        await db.transaction("rw",db.cards,db.syncMeta,async()=>{
          await db.cards.bulkPut(published.cards);
          await db.syncMeta.put({key:"cards",lastSyncedAt:published.generatedAt,cursor});
        });
        meta = await db.syncMeta.get("cards");
      }
    } catch {
      // A missing/offline bootstrap falls back to the existing paginated API sync.
    }
  }
  const since = meta?.cursor ?? undefined;

  let page = 1;
  let fetched = 0;
  let total: number | null = null;
  let maxLastUpdate = since ?? null;

  onProgress?.({ phase: "syncing", fetched: 0, total: null });

  for (;;) {
    const res = await gatcgApi.searchCards({
      page,
      page_size: PAGE_SIZE,
      sort: "name",
      order: "ASC",
      last_update: since,
    });

    if (res.data.length) {
      await db.cards.bulkPut(res.data);
      fetched += res.data.length;
      for (const card of res.data) {
        if (!maxLastUpdate || card.last_update > maxLastUpdate) maxLastUpdate = card.last_update;
      }
    }

    total = res.total_cards;
    onProgress?.({ phase: "syncing", fetched, total });

    if (!res.has_more) break;
    page += 1;
  }

  await db.syncMeta.put({
    key: "cards",
    lastSyncedAt: new Date().toISOString(),
    cursor: maxLastUpdate,
  });

  onProgress?.({ phase: "done", fetched, total });
}
