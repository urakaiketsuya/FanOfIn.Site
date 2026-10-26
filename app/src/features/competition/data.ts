import type { CompetitionData } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
export function useCompetition<T>(name: 'seasons' | 'battle' | 'players' | 'places' | 'teams', enabled = true) {
  const key = `competition-${name}`, url = `/data/analysis/${key}.json`;
  const data = usePublishedData<CompetitionData<T>>(key, url, enabled);
  const status = usePublishedDataStatus(key, url, enabled);
  return { data, status };
}
