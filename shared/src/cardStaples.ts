/** Section statistics are observations, independent of main + material deck identity. */
export const STAPLE_SECTIONS = ["main", "material", "sideboard"] as const;
export type StapleSection = typeof STAPLE_SECTIONS[number];
export type StaplePeriod = "30" | "90" | "all";
export interface StapleCard {
  id: string;
  name: string;
  slug: string | null;
  elements: string[];
  keywords: string[];
  types: string[];
  classes: string[];
  championLevel: number | null;
  memoryCost: number | null;
  reserveCost: number | null;
}
/** Dictionary indexes keep the published projection small. Rates are fractions, not percents. */
export type StapleRow = [card: number, decks: number, copies: number, typicalCopies: number, resultDecks: number, adjustedWinRate: number | null];
export interface StapleSectionStats {
  decks: number; rows: StapleRow[];
  /** Counts of reported sections by card-presence pattern (quantities do not matter). */
  populations?: [pattern: number, decks: number][];
}
export interface StapleCohort {
  period: StaplePeriod;
  /** null denotes the aggregate, never a missing format/champion label. */
  format: string | null;
  champion: string | null;
  decks: number;
  sections: Record<StapleSection, StapleSectionStats>;
}
export interface CardStaplesData {
  generatedAt: string;
  throughDate: string | null;
  cards: StapleCard[];
  cohorts: StapleCohort[];
  /** Shared dictionary of distinct card-index sets across sections and cohorts. */
  sectionPatterns?: number[][];
}
export interface StapleFilters {
  search: string;
  elements: string[];
  keywords: string[];
  keywordMode: "any" | "all";
  type: string;
  cardClass: string;
  level: string;
  costKind: "reserve" | "memory";
  maxCost: string;
  minDecks: number;
  sort: "usage" | "winning" | "quantity";
}
/** Card predicates shared by visible rows and their filtered deck denominator. */
export function matchesStapleCard(card: StapleCard, filters: StapleFilters): boolean {
  if (!card.name.toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
  if (filters.elements.length && !filters.elements.some(element => card.elements.includes(element))) return false;
  if (filters.keywords.length && !(filters.keywordMode === "all"
    ? filters.keywords.every(keyword => card.keywords.includes(keyword))
    : filters.keywords.some(keyword => card.keywords.includes(keyword)))) return false;
  if (filters.type && !card.types.includes(filters.type)) return false;
  if (filters.cardClass && !card.classes.includes(filters.cardClass)) return false;
  if (filters.level && card.championLevel !== Number(filters.level)) return false;
  const cost = filters.costKind === "memory" ? card.memoryCost : card.reserveCost;
  return filters.maxCost === "" || (cost !== null && cost <= Number(filters.maxCost));
}

/** Union of decks with a matching card in this section, never a sum of card counts.
 * Ranking, pagination and minimum sample size do not change the population.
 * Old cached projections cannot supply a filtered denominator: report unavailable.
 */
export function staplePopulation(data: CardStaplesData, stats: StapleSectionStats, filters: StapleFilters): number | null {
  if (!filters.search.trim() && !filters.elements.length && !filters.keywords.length && !filters.type && !filters.cardClass && !filters.level && filters.maxCost === "") return stats.decks;
  if (!data.sectionPatterns || !stats.populations) return null;
  const matching = new Set(data.cards.flatMap((card, index) => matchesStapleCard(card, filters) ? [index] : []));
  return stats.populations.reduce((total, [pattern, decks]) => total + (data.sectionPatterns![pattern].some(card => matching.has(card)) ? decks : 0), 0);
}

export function selectStapleRows(cards: StapleCard[], rows: StapleRow[], filters: StapleFilters): StapleRow[] {
  return rows.filter(row => {
    const card = cards[row[0]];
    if (!card || row[1] < filters.minDecks || !matchesStapleCard(card, filters)) return false;
    // An absent result isn't a 50% performance observation.
    return filters.sort !== "winning" || (row[5] !== null && row[4] >= Math.max(5, filters.minDecks));
  }).sort((a, b) => {
    const score = filters.sort === "winning" ? (b[5] ?? -1) - (a[5] ?? -1)
      : filters.sort === "quantity" ? b[2] / b[1] - a[2] / a[1] : b[1] - a[1];
    return score || b[1] - a[1] || cards[a[0]].name.localeCompare(cards[b[0]].name);
  });
}
