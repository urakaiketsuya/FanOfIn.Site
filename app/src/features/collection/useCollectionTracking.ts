import { useCallback, useEffect, useState } from "react";
import type { CollectionCardTracking, CollectionCardTrackingUpdate } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";

export function useCollectionTracking(enabled: boolean) {
  const [records, setRecords] = useState<CollectionCardTracking[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setReady(false); setError(null);
    try { const result = await accountApi.collectionTracking(); setRecords(result.cards); setReady(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load card tracking."); }
  }, []);
  useEffect(() => { if (enabled) void refresh(); else { setRecords([]); setReady(false); } }, [enabled, refresh]);
  async function save(cardUuid: string, input: CollectionCardTrackingUpdate) {
    const {card} = await accountApi.saveCollectionTracking(cardUuid, input);
    setRecords(current => [...current.filter(item=>item.cardUuid !== cardUuid), card]);
  }
  return {records, ready, error, refresh, save};
}
