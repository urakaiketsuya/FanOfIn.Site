import { emptyDeckSearch } from '@gatcg/shared';
import { useUrlFilters } from '../filters/useUrlFilters';
const fields = { champion: 'champion', cards: 'card' };
export function useDeckSearch(prefix = 'deck-search-') {
  return useUrlFilters(emptyDeckSearch, prefix, fields);
}
