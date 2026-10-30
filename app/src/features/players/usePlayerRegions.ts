import { useMemo } from 'react';
import { assignUSPlayerRegions, type OmnidexPlayersData, type OmnidexIndexData, type StoreDirectory } from '@gatcg/shared';
import { usePublishedData } from '../../lib/sync/usePublishedData';

export function usePlayerRegions(players: OmnidexPlayersData | undefined, events: OmnidexIndexData | undefined) {
  const stores = usePublishedData<StoreDirectory>('store-directory', '/data/omnidex/stores.json');
  return useMemo(() => {
    if (!players || !events || !stores) return undefined;
    const asOf = [players.generatedAt, events.generatedAt, stores.generatedAt].sort()[0];
    return assignUSPlayerRegions(players.players, events.events, stores.stores, asOf);
  }, [players, events, stores]);
}
