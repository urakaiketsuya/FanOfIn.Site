import type { Card } from "@gatcg/shared";

export interface CardFilterState {
  name: string;
  artist: string;
  classes: Set<string>;
  types: Set<string>;
  elements: Set<string>;
}

export function emptyFilterState(): CardFilterState {
  return { name: "", artist: "", classes: new Set(), types: new Set(), elements: new Set() };
}

export function filterCards(cards: Card[], filters: CardFilterState): Card[] {
  const name = filters.name.trim().toLowerCase();
  const artist = filters.artist.trim().toLowerCase();
  return cards.filter((card) => {
    if (name && !card.name.toLowerCase().includes(name)) return false;
    if (artist && !card.editions.some((ed) => ed.illustrator?.toLowerCase().includes(artist))) return false;
    if (filters.classes.size && !card.classes.some((c) => filters.classes.has(c))) return false;
    if (filters.types.size && !card.types.some((t) => filters.types.has(t))) return false;
    if (filters.elements.size && !card.elements.some((e) => filters.elements.has(e))) return false;
    return true;
  });
}
