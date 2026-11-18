import { previewCardSet, PREVIEW_SET } from "../../lib/previewCards";
import { matchesSearchExpression, matchesNumericSearch, type ParsedFilterQuery, matchesSearchClauses, includeFilterValue, matchesFilterValues, filterValue, parseFilterQuery } from "@gatcg/shared";
import { canonicalCardTag } from "@gatcg/shared";
import { searchSetPrefix, type Card } from "@gatcg/shared";
import type { CardTagLookup } from "./cardTags";

export type SpeedFilter = "any" | "fast" | "normal";

export interface CardFilterState {
  /** Matched against both the card's name and its rules text (`Card.effect`). */
  name: string;
  artist: string;
  classes: Set<string>;
  types: Set<string>;
  subtypes: Set<string>;
  elements: Set<string>;
  /** Set-family prefixes; historical edition prefixes also resolve to their family. */
  sets: Set<string>;
  /** `Card.speed` – true/false is a printed characteristic of Action/Reaction-type cards (Reactions
   * are always fast); other types don't have one at all (null), so "normal" only ever matches
   * Action cards explicitly printed as normal-speed, not every non-fast card in the catalog. */
  speed: SpeedFilter;
  /** Optional exact printing-set restriction, independent of the family filter. */
  printingSets?: Set<string>;
  /** Rarity codes matched on the same printing as set and artist restrictions. */
  rarities?: Set<string>;
  /** silvie.gg community art tags (any-of); only applied when `filterCards` gets a tag lookup. */
  tags?: Set<string>;
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
    printingSets: new Set(),
    rarities: new Set(),
    tags: new Set(),
  };
}

export function matchesEdition(edition: Card["editions"][number], filters: CardFilterState): boolean {
  const families = new Set([...filters.sets].map(v => (v.startsWith("-") ? "-" : "") + searchSetPrefix(filterValue(v))));
  return matchesFilterValues([searchSetPrefix(edition.set.prefix)], families)
    && matchesFilterValues([edition.set.prefix], filters.printingSets ?? new Set())
    && matchesFilterValues([String(edition.rarity)], filters.rarities ?? new Set())
    && (!filters.artist.trim() || !!edition.illustrator?.toLowerCase().includes(filters.artist.trim().toLowerCase()));
}

/** Text users can search for a card, including every API-linked reverse face. */
export function cardSearchText(card: Card): string {
  return [
    card.name,
    card.effect,
    ...card.editions.flatMap((edition) =>
      (edition.other_orientations ?? []).flatMap((face) => [face.name, face.effect]),
    ),
  ].filter((value): value is string => Boolean(value)).join(" ").toLocaleLowerCase();
}

function hasAnyTag(tags: ReadonlySet<string> | undefined, selected: ReadonlySet<string>): boolean {
  return matchesFilterValues(tags ?? [], new Set([...selected].map(tag => tag.startsWith("-") ? "-" + canonicalCardTag(filterValue(tag)) : includeFilterValue(canonicalCardTag(filterValue(tag))))));
}

/** The printing whose art carries a selected tag, when tags are filtered – else undefined. */
export function editionWithTag(card: Card, filters: CardFilterState, tagLookup: CardTagLookup | undefined): Card["editions"][number] | undefined {
  if (!filters.tags?.size || !tagLookup) return undefined;
  return card.editions.find((ed) => hasAnyTag(tagLookup.editions.get(ed.uuid), filters.tags!) && matchesEdition(ed, filters));
}

export function filterCards(cards: Card[], filters: CardFilterState, tagLookup?: CardTagLookup): Card[] {
  return filterParsedCards(cards, filters, parseFilterQuery(filters.name), tagLookup);
}

/** Match a named pool without losing entries whose catalog record is unavailable.
 * Unknown metadata stays unknown under NOT; a known name branch can still satisfy OR.
 */
export function filterCardNames(names: readonly string[], catalog: ReadonlyMap<string, Card>, query: string): string[] {
  const parsed = parseFilterQuery(query);
  if (parsed.error) return [];
  const known = new Set(filterParsedCards([...catalog.values()], emptyFilterState(), parsed).map(card => card.name));
  const leaves = new Map<string, ParsedFilterQuery>();
  type Result = boolean | undefined;
  const and = (a: Result, b: Result): Result => a === false || b === false ? false : a === undefined || b === undefined ? undefined : true;
  const evaluate = (name: string, node: ParsedFilterQuery): Result => {
    if (node.expression) {
      const visit = (expression: NonNullable<ParsedFilterQuery['expression']>): Result => {
        if (expression.kind === 'leaf') {
          if (!leaves.has(expression.query)) leaves.set(expression.query, parseFilterQuery(expression.query));
          return evaluate(name, leaves.get(expression.query)!);
        }
        if (expression.kind === 'not') {
          const result = visit(expression.child);
          return result === undefined ? undefined : !result;
        }
        const left = visit(expression.left), right = visit(expression.right);
        return expression.kind === 'and' ? and(left, right)
          : left === true || right === true ? true : left === undefined || right === undefined ? undefined : false;
      };
      return visit(node.expression);
    }
    const nameClauses = node.clauses.filter(clause => clause.field === 'name' || clause.field === 'any');
    const namesMatch = matchesSearchClauses({ name: [name], effect: [] }, nameClauses);
    const unknown = Object.keys(node.facets).length > 0 || !!node.numeric?.length || nameClauses.length !== node.clauses.length;
    return and(namesMatch, unknown ? undefined : true);
  };
  return names.filter(name => catalog.has(name) ? known.has(name) : evaluate(name, parsed) === true);
}

function filterParsedCards(cards: Card[], filters: CardFilterState, parsed: ParsedFilterQuery, tagLookup?: CardTagLookup): Card[] {
  if (parsed.error) return [];
  if (parsed.expression) {
    const leaves = new Map<string, ParsedFilterQuery>();
    const base = { ...filters, name: '' };
    const empty = parseFilterQuery('');
    return cards.filter(card => {
      const faces = card.editions.flatMap(edition => edition.other_orientations ?? []);
      const candidates = card.editions.length ? card.editions.map(edition => ({ ...card, editions: [{ ...edition, other_orientations: faces }] })) : [card];
      return candidates.some(candidate => filterParsedCards([candidate], base, empty, tagLookup).length > 0
        && matchesSearchExpression(parsed.expression!, query => {
          if (!leaves.has(query)) leaves.set(query, parseFilterQuery(query));
          return filterParsedCards([candidate], emptyFilterState(), leaves.get(query)!, tagLookup).length > 0;
        }));
    });
  }
  filters = { ...filters, ...Object.fromEntries(Object.entries(parsed.facets).map(([key, values]) => [key, new Set([...(filters[key as keyof CardFilterState] as Set<string> ?? []), ...values])])) };
  const textClauses = parsed.clauses.filter(clause => clause.field !== "artist");
  const artistClauses = parsed.clauses.filter(clause => clause.field === "artist");
  const eligibleEdition = (edition: Card["editions"][number]) => matchesEdition(edition, filters)
    && matchesSearchClauses({ name: [], effect: [], artist: [edition.illustrator ?? ""] }, artistClauses);

  return cards.filter((card) => {
    if (!matchesNumericSearch(card, parsed.numeric ?? [])) return false;
    const faces = card.editions.flatMap(edition => edition.other_orientations ?? []);
    if (!matchesSearchClauses({
      name: [card.name, ...faces.map(face => face.name)].filter((value): value is string => Boolean(value)),
      effect: [card.effect, ...faces.map(face => face.effect)].filter((value): value is string => Boolean(value)),
    }, textClauses)) return false;

    if (filters.classes.size && !matchesFilterValues(card.classes, filters.classes)) return false;
    if (filters.types.size && !matchesFilterValues(card.types, filters.types)) return false;
    if (filters.subtypes.size && !matchesFilterValues(card.subtypes, filters.subtypes)) return false;
    if (filters.elements.size && !matchesFilterValues(card.elements, filters.elements)) return false;
    if (filters.sets.size || filters.printingSets?.size || filters.rarities?.size || filters.artist.trim() || artistClauses.length) {
      const previewPrefix = previewCardSet(card);
      const previewMatches = previewPrefix && !filters.rarities?.size && !filters.artist.trim() && !artistClauses.length
        && matchesFilterValues([PREVIEW_SET.prefix, previewPrefix], filters.sets)
        && matchesFilterValues([previewPrefix], filters.printingSets ?? new Set());
      if (!previewMatches && !card.editions.some(eligibleEdition)) return false;
    }
    if (filters.speed === "fast" && card.speed !== true) return false;
    if (filters.speed === "normal" && card.speed !== false) return false;
    if (filters.tags?.size && (!tagLookup || !hasAnyTag(tagLookup.cards.get(card.uuid), filters.tags))) return false;
    return true;
  });
}
