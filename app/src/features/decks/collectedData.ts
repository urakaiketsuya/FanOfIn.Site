import { collectedDecklist, deckBuildSignature, type CollectedDeckData, type CollectedBuild } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
export const collectedUrl = '/data/community/collected.json';
export function useCollectedDecks(enabled = true) { return usePublishedData<CollectedDeckData>('community-collected', collectedUrl, enabled); }
export function useCollectedStatus(enabled = true) { return usePublishedDataStatus('community-collected', collectedUrl, enabled); }
export function collectedSignature(deck: CollectedBuild, names: string[]) {
  const list = collectedDecklist(deck.variants[0], names);
  return deckBuildSignature(list.main.map(l => ({ name: l.card, quantity: l.quantity })), list.material.map(l => ({ name: l.card, quantity: l.quantity })));
}
