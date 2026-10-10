import type { Card, DeckCardIndexData, DeckPopularityIndexData } from '@gatcg/shared';
import type { PopularDeck } from './popularityAggregation';

export interface PopularityInput {
  cardIndex: DeckCardIndexData;
  sightings: DeckPopularityIndexData;
  catalog: Card[];
}
export type PopularityResponse = { decks: PopularDeck[]; error?: never } | { error: string; decks?: never };
export const POPULARITY_ERROR = 'Deck builds could not load. Try again.';

