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
 * interrupted, the next run just starts the bulk fetch over — bulkPut is
 * idempotent (keyed by uuid) so this is wasteful but not incorrect.
 */
export async function syncCards(onProgress?: (progress: SyncProgress) => void): Promise<void> {
  const meta = await db.syncMeta.get("cards");
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
