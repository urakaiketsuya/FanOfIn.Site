import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { emptyDeckSearch } from '@gatcg/shared';
import { useUrlFilters } from '../filters/useUrlFilters';
const fields = { champion: 'champion', cards: 'card' };
export function useDeckSearch(prefix = 'deck-search-') {
  return useUrlFilters(emptyDeckSearch, prefix, fields);
}

export const DECK_QUERY_DELAY_MS = 350;

export function useDebouncedDeckQuery(query: string) {
  return useDebouncedValue(query, DECK_QUERY_DELAY_MS);
}
