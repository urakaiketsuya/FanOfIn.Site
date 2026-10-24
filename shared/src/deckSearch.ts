import { matchesFilterValues } from './searchFilters';

/** Source-independent family key; exact champion variants remain named-card requirements. */
export function deckSearchChampion(value: string | null | undefined): string {
  return (value ?? '').split(',')[0].trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

export interface DeckSearchFilter { champion: string; cards: string[] }
export function emptyDeckSearch(): DeckSearchFilter { return { champion: '', cards: [] }; }

export function deckMatchesSearch(champion: string | null | undefined, names: Iterable<string> | undefined, filter: DeckSearchFilter): boolean {
  if (filter.champion && deckSearchChampion(champion) !== deckSearchChampion(filter.champion)) return false;
  if (!filter.cards.length) return true;
  // Unknown membership must never be presented as a confirmed match, including exclusions.
  if (!names) return false;
  return matchesFilterValues(new Set(names), new Set(filter.cards), true);
}

export function searchableDeckCards(deck: { main: { card: string; quantity: number }[]; material: { card: string; quantity: number }[] }): string[] {
  return [...new Set([...deck.main, ...deck.material].filter(line => line.quantity > 0).map(line => line.card))];
}
