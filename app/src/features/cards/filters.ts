import { setFamilyPrefix, type Card } from "@gatcg/shared";

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
  /** `Card.speed` — true/false is a printed characteristic of Action/Reaction-type cards (Reactions
   * are always fast); other types don't have one at all (null), so "normal" only ever matches
   * Action cards explicitly printed as normal-speed, not every non-fast card in the catalog. */
  speed: SpeedFilter;
  /** Optional exact printing-set restriction, independent of the family filter. */
  printingSets?: Set<string>;
  /** Rarity codes matched on the same printing as set and artist restrictions. */
  rarities?: Set<string>;
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
    rarities: new Set(),
  };
}

export function matchesEdition(edition: Card["editions"][number], filters: CardFilterState): boolean {
  const families = new Set([...filters.sets].map(setFamilyPrefix));
  return (!families.size || families.has(setFamilyPrefix(edition.set.prefix)))
    && (!filters.printingSets?.size || filters.printingSets.has(edition.set.prefix))
    && (!filters.rarities?.size || filters.rarities.has(String(edition.rarity)))
    && (!filters.artist.trim() || !!edition.illustrator?.toLowerCase().includes(filters.artist.trim().toLowerCase()));
}

export function filterCards(cards: Card[], filters: CardFilterState): Card[] {
  const name = filters.name.trim().toLowerCase();

  return cards.filter((card) => {
    if (name && !card.name.toLowerCase().includes(name) && !card.effect?.toLowerCase().includes(name)) return false;

    if (filters.classes.size && !card.classes.some((c) => filters.classes.has(c))) return false;
    if (filters.types.size && !card.types.some((t) => filters.types.has(t))) return false;
    if (filters.subtypes.size && !card.subtypes.some((s) => filters.subtypes.has(s))) return false;
    if (filters.elements.size && !card.elements.some((e) => filters.elements.has(e))) return false;
    if ((filters.sets.size || filters.printingSets?.size || filters.rarities?.size || filters.artist.trim()) && !card.editions.some(ed => matchesEdition(ed, filters))) return false;
    if (filters.speed === "fast" && card.speed !== true) return false;
    if (filters.speed === "normal" && card.speed !== false) return false;
    return true;
  });
}
