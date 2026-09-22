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

/**
 * Quantity-weighted relevance for the active content facets. Each facet contributes equally, so
 * a broad selection such as Element does not drown out a narrower Subtype selection. Multiple
 * values inside one facet remain OR choices, matching the eligibility behavior above.
 */
export function deckContentRelevance(
  lines: DeckCardIndexLine[],
  filters: DeckContentFilterState,
  cardsByName: ReadonlyMap<string, Card>,
): number {
  const totalCopies = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (totalCopies === 0) return 0;

  const facets: Array<(name: string, card: Card | undefined) => boolean> = [];
  if (filters.cards.length) facets.push((name) => filters.cards.includes(name));
  if (filters.classes.size) facets.push((_name, card) => !!card?.classes.some((value) => filters.classes.has(value)));
  if (filters.types.size) facets.push((_name, card) => !!card?.types.some((value) => filters.types.has(value)));
  if (filters.subtypes.size) facets.push((_name, card) => !!card?.subtypes.some((value) => filters.subtypes.has(value)));
  if (filters.elements.size) facets.push((_name, card) => !!card?.elements.some((value) => filters.elements.has(value)));
  if (filters.sets.size) facets.push((_name, card) => !!card?.editions.some((edition) => filters.sets.has(edition.set.prefix)));
  if (filters.speed !== "any") facets.push((_name, card) => card?.speed === (filters.speed === "fast"));
  if (facets.length === 0) return 0;

  const combinedShare = facets.reduce((sum, matches) => {
    const matchingCopies = lines.reduce((copies, line) => copies + (matches(line.name, cardsByName.get(line.name)) ? line.quantity : 0), 0);
    return sum + matchingCopies / totalCopies;
  }, 0);
  return combinedShare / facets.length;
}
