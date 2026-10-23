import { includeFilterValue, matchesFilterValues, filterValue, parseFilterQuery } from "@gatcg/shared";
import { canonicalCardTag } from "@gatcg/shared";
import { setFamilyPrefix, type Card } from "@gatcg/shared";
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
  const families = new Set([...filters.sets].map(v => (v.startsWith("-") ? "-" : "") + setFamilyPrefix(filterValue(v))));
  return matchesFilterValues([setFamilyPrefix(edition.set.prefix)], families)
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
  const parsed = parseFilterQuery(filters.name);
  if (parsed.error) return [];
  filters = { ...filters, ...Object.fromEntries(Object.entries(parsed.facets).map(([key, values]) => [key, new Set([...(filters[key as keyof CardFilterState] as Set<string> ?? []), ...values])])) };
  const name = parsed.text.trim().toLowerCase();

  return cards.filter((card) => {
    if (name && !cardSearchText(card).includes(name)) return false;

    if (filters.classes.size && !matchesFilterValues(card.classes, filters.classes)) return false;
    if (filters.types.size && !matchesFilterValues(card.types, filters.types)) return false;
    if (filters.subtypes.size && !matchesFilterValues(card.subtypes, filters.subtypes)) return false;
    if (filters.elements.size && !matchesFilterValues(card.elements, filters.elements)) return false;
    if ((filters.sets.size || filters.printingSets?.size || filters.rarities?.size || filters.artist.trim()) && !card.editions.some(ed => matchesEdition(ed, filters))) return false;
    if (filters.speed === "fast" && card.speed !== true) return false;
    if (filters.speed === "normal" && card.speed !== false) return false;
    if (filters.tags?.size && (!tagLookup || !hasAnyTag(tagLookup.cards.get(card.uuid), filters.tags))) return false;
    return true;
  });
}
