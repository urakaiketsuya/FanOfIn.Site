import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionCardTracking, CollectionCardTrackingUpdate } from "@gatcg/shared";
import { subscribeCollectionChanges } from "../../lib/collectionEvents";
import { accountApi } from "../../lib/accountApi";

export function useCardLocations(enabled: boolean) {
  const [records, setRecords] = useState<CollectionCardTracking[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    setError(null);
    try {
      const result = await accountApi.collectionTracking();
      if (request !== revision.current) return false;
      setRecords(result.cards); setReady(true);
      return true;
    } catch (reason) {
      if (request === revision.current) setError(reason instanceof Error ? reason.message : "Could not load card tracking.");
      return false;
    }
  }, []);
  const invalidate = useCallback(() => { ++revision.current; }, []);
  useEffect(() => {
    if (!enabled) { setRecords([]); setReady(false); return; }
    void refresh();
    const unsubscribe = subscribeCollectionChanges(() => { void refresh(); });
    return () => { invalidate(); unsubscribe(); };
  }, [enabled, refresh, invalidate]);
  async function save(cardUuid: string, input: CollectionCardTrackingUpdate) {
    const {card} = await accountApi.saveCollectionTracking(cardUuid, input);
    ++revision.current;
    setRecords(current => [...current.filter(item=>item.cardUuid !== cardUuid), card]);
  }
  async function saveBatch(inputs: (CollectionCardTrackingUpdate & {cardUuid: string})[]) {
    const {cards} = await accountApi.saveCollectionTrackingBatch(inputs);
    const changed = new Set(cards.map(card=>card.cardUuid));
    ++revision.current;
    setRecords(current => [...current.filter(card=>!changed.has(card.cardUuid)), ...cards]);
  }
  return {records, ready, error, refresh, save, saveBatch};
}
