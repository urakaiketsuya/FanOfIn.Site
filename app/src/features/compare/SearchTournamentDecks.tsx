import { useMemo, useState } from 'react';
import { deckMatchesSearch } from '@gatcg/shared';
import DeckSearchFilters from '../../components/deck-search/DeckSearchFilters';
import { useDeckSearch } from '../../components/deck-search/useDeckSearch';
import { useTournamentCardMatches } from '../../components/deck-search/useTournamentCardMatches';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Button from '../../components/ui/Button';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useDeckSightingsData } from '../topdecks/data';
import { usePlayerNameById } from '../tournaments/data';
import DeckSightingRow from '../topdecks/DeckSightingRow';
import type { ComparedDeck } from './types';

export default function SearchTournamentDecks({ comparedKeys, onToggle }: { comparedKeys: Set<string>; onToggle: (deck: ComparedDeck) => void }) {
  const [filter, setFilter] = useDeckSearch();
  const [limit, setLimit] = useState(20);
  const data = useDeckSightingsData();
  const status = usePublishedDataStatus('analysis-deck-sightings', '/data/analysis/deck-sightings.json');
  const cards = useTournamentCardMatches(filter.cards);
  const playerName = usePlayerNameById();
  const matches = useMemo(() => (data?.sightings ?? []).filter(deck => deckMatchesSearch(deck.championName, undefined, { ...filter, cards: [] }) && (!cards.ids || cards.ids.has(deck.deckId))).sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [data, filter, cards.ids]);
  return <div>
    <DeckSearchFilters champion={filter.champion} onChampionChange={champion => { setFilter(f => ({ ...f, champion })); setLimit(20); }} cards={filter.cards} onCardsChange={cards => { setFilter(f => ({ ...f, cards })); setLimit(20); }} />
    <PublishedSourceStatus label="Tournament decks" status={status} hasData={!!data} />
    {!!filter.cards.length && <PublishedSourceStatus label="Deck cards" status={cards.status} hasData={cards.hasData} />}
    {!cards.loading && data && <p role="status" className="my-3 text-sm">{matches.length.toLocaleString()} matching decks</p>}
    <div className="space-y-3">{matches.slice(0, limit).map(deck => <DeckSightingRow key={deck.deckId} sighting={deck} playerName={playerName(deck.player)} championCard={undefined} added={comparedKeys.has(deck.deckId)} onAdd={() => onToggle({ key: deck.deckId, label: `${playerName(deck.player)} @ ${deck.eventName}`, source: { kind: 'sighting', eventId: deck.eventId, player: deck.player } })} />)}</div>
    {matches.length > limit && <Button onClick={() => setLimit(n => n + 20)}>Load more</Button>}
  </div>;
}
