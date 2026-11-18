import { parseFilterQuery } from "@gatcg/shared";
import { searchCardPool } from "../features/cards/filters";
import type { Card } from "@gatcg/shared";
import spoilers from "../../../data/reference/card-spoilers-2026-11-01.json";
import { mergePreviewCards } from "./previewCards";

/** Shared display catalog: official records supersede editorial previews. */
export function withSpoilerCards(cards: Card[]): Card[] {
  return mergePreviewCards(cards, spoilers.cards, true);
}

/** Spoiler browsing historically includes class/type/element words in bare searches. */
export function searchSpoilers(query: string) {
  const parsed = parseFilterQuery(query);
  const matches = new Set(searchCardPool(spoilers.cards, mergePreviewCards([], spoilers.cards, true), query).map(card => card.name));
  const plain = !parsed.error && !parsed.expression && !Object.keys(parsed.facets).length && !parsed.numeric?.length
    && parsed.clauses.every(clause => clause.field === 'any' && !clause.exclude && !clause.exact);
  return spoilers.cards.filter(card => matches.has(card.name) || (plain &&
    [card.name, card.effect, ...card.classes, ...card.types, ...card.subtypes, ...card.elements].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
}
