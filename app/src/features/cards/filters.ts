import type { Card } from "@gatcg/shared";

export type SpeedFilter = "any" | "fast" | "normal";

export interface CardFilterState {
  name: string;
  artist: string;
  classes: Set<string>;
  types: Set<string>;
  subtypes: Set<string>;
  elements: Set<string>;
  /** Set prefixes (e.g. "ROTX"), matched against any of a card's editions — same convention as the former SetDetail page. */
  sets: Set<string>;
  /** `Card.speed` — true/false is a printed characteristic of Action/Reaction-type cards (Reactions
   * are always fast); other types don't have one at all (null), so "normal" only ever matches
   * Action cards explicitly printed as normal-speed, not every non-fast card in the catalog. */
  speed: SpeedFilter;
}

export function emptyFilterState(): CardFilterState {
  return {
    name: "",
    artist: "",
    classes: new Set(),
    types: new Set(),
    subtypes: new Set(),
    elements: new Set(),
    sets: new Set(),
    speed: "any",
  };
}

export function filterCards(cards: Card[], filters: CardFilterState): Card[] {
  const name = filters.name.trim().toLowerCase();
  const artist = filters.artist.trim().toLowerCase();
  return cards.filter((card) => {
    if (name && !card.name.toLowerCase().includes(name)) return false;
    if (artist && !card.editions.some((ed) => ed.illustrator?.toLowerCase().includes(artist))) return false;
    if (filters.classes.size && !card.classes.some((c) => filters.classes.has(c))) return false;
    if (filters.types.size && !card.types.some((t) => filters.types.has(t))) return false;
    if (filters.subtypes.size && !card.subtypes.some((s) => filters.subtypes.has(s))) return false;
    if (filters.elements.size && !card.elements.some((e) => filters.elements.has(e))) return false;
    if (filters.sets.size && !card.editions.some((ed) => filters.sets.has(ed.set.prefix))) return false;
    if (filters.speed === "fast" && card.speed !== true) return false;
    if (filters.speed === "normal" && card.speed !== false) return false;
    return true;
  });
}
