import type { Card, DeckCardIndexLine } from "@gatcg/shared";

export type DeckSpeedFilter = "any" | "fast" | "normal";

export interface DeckContentFilterState {
  cards: string[];
  classes: Set<string>;
  types: Set<string>;
  subtypes: Set<string>;
  elements: Set<string>;
  sets: Set<string>;
  speed: DeckSpeedFilter;
}

export function emptyDeckContentFilters(): DeckContentFilterState {
  return { cards: [], classes: new Set(), types: new Set(), subtypes: new Set(), elements: new Set(), sets: new Set(), speed: "any" };
}

export function deckContentFilterCount(filters: DeckContentFilterState): number {
  return filters.cards.length + filters.classes.size + filters.types.size + filters.subtypes.size + filters.elements.size + filters.sets.size + (filters.speed === "any" ? 0 : 1);
}

/** Deck-content facets use main + material only, the same sections that define deck identity. */
export function deckMatchesContentFilters(
  lines: DeckCardIndexLine[],
  filters: DeckContentFilterState,
  cardsByName: ReadonlyMap<string, Card>,
): boolean {
  const names = new Set(lines.map((line) => line.name));
  if (filters.cards.some((name) => !names.has(name))) return false;
  const cards = lines.map((line) => cardsByName.get(line.name)).filter((card): card is Card => !!card);
  if (filters.classes.size && !cards.some((card) => card.classes.some((value) => filters.classes.has(value)))) return false;
  if (filters.types.size && !cards.some((card) => card.types.some((value) => filters.types.has(value)))) return false;
  if (filters.subtypes.size && !cards.some((card) => card.subtypes.some((value) => filters.subtypes.has(value)))) return false;
  if (filters.elements.size && !cards.some((card) => card.elements.some((value) => filters.elements.has(value)))) return false;
  if (filters.sets.size && !cards.some((card) => card.editions.some((edition) => filters.sets.has(edition.set.prefix)))) return false;
  if (filters.speed === "fast" && !cards.some((card) => card.speed === true)) return false;
  if (filters.speed === "normal" && !cards.some((card) => card.speed === false)) return false;
  return true;
}
