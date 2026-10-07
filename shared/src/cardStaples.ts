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
export interface StapleSectionStats { decks: number; rows: StapleRow[] }
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
export function selectStapleRows(cards: StapleCard[], rows: StapleRow[], filters: StapleFilters): StapleRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(row => {
    const card = cards[row[0]];
    if (!card || row[1] < filters.minDecks || !card.name.toLowerCase().includes(search)) return false;
    if (filters.elements.length && !filters.elements.some(element => card.elements.includes(element))) return false;
    if (filters.keywords.length && !(filters.keywordMode === "all"
      ? filters.keywords.every(keyword => card.keywords.includes(keyword))
      : filters.keywords.some(keyword => card.keywords.includes(keyword)))) return false;
    if (filters.type && !card.types.includes(filters.type)) return false;
    if (filters.cardClass && !card.classes.includes(filters.cardClass)) return false;
    if (filters.level && card.championLevel !== Number(filters.level)) return false;
    const cost = filters.costKind === "memory" ? card.memoryCost : card.reserveCost;
    if (filters.maxCost !== "" && (cost === null || cost > Number(filters.maxCost))) return false;
    // An absent result isn't a 50% performance observation.
    return filters.sort !== "winning" || (row[5] !== null && row[4] >= Math.max(5, filters.minDecks));
  }).sort((a, b) => {
    const score = filters.sort === "winning" ? (b[5] ?? -1) - (a[5] ?? -1)
      : filters.sort === "quantity" ? b[2] / b[1] - a[2] / a[1] : b[1] - a[1];
    return score || b[1] - a[1] || cards[a[0]].name.localeCompare(cards[b[0]].name);
  });
}
