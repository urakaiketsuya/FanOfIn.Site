import { useMemo } from 'react';
import { decodeCardLines, deckMatchesSearch } from '@gatcg/shared';
import { useDeckCardIndexData } from '../../features/archetypes/data';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';

export function useTournamentCardMatches(cards: string[]) {
  const data = useDeckCardIndexData(cards.length > 0);
  const status = usePublishedDataStatus('analysis-deck-card-index', '/data/analysis/deck-card-index.json', cards.length > 0);
  const ids = useMemo(() => {
    if (!cards.length) return null;
    const matches = new Set<string>();
    if (data?.cardNames) for (const deck of data.decks) {
      const names = decodeCardLines([...deck.main, ...deck.material], data.cardNames).filter(line => line.quantity > 0).map(line => line.name);
      if (deckMatchesSearch(null, names, { champion: '', cards })) matches.add(deck.deckId);
    }
    return matches;
  }, [data, cards]);
  return { ids, status, loading: cards.length > 0 && !data?.cardNames, hasData: !!data?.cardNames };
}
