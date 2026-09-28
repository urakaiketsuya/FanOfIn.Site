import {shortHash,type DeckDetailData} from '@gatcg/shared';
import {usePublishedData,usePublishedDataStatus} from '../../lib/sync/usePublishedData';
import {useDeckCardIndexData} from '../archetypes/data';
import {useDeckPopularityIndexData} from '../topdecks/data';

/** Champion tools share a bounded dataset; old/offline deployments retain their full-index fallback. */
export function useChampionDeckData(championName: string | null) {
  const hash = shortHash(championName ?? 'Unknown');
  const key = `champion-decks-${hash}`;
  const url = `/data/analysis/champion-decks/${hash}.json`;
  const scoped = usePublishedData<DeckDetailData>(key,url,Boolean(championName));
  const status = usePublishedDataStatus(key,url,Boolean(championName));
  const fallback = Boolean(championName) && status.phase === 'error' && !scoped;
  const fullCardIndex = useDeckCardIndexData(fallback);
  const fullPopularity = useDeckPopularityIndexData(fallback);
  return {cards:scoped?.cards ?? fullCardIndex,popularity:scoped?.popularity ?? fullPopularity};
}
