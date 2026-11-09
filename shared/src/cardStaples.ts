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
  /** Highest-level champion card of the champion's main-line (e.g. "Jin, Undying Resolve").
   * null on a champion cohort means all builds of that champion. Absent in older projections.
   * Cohorts with a card partition their champion's decks: no deck is in two of them. */
  championCard?: string | null;
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
/** No card facets, ranked by usage. Champion pages use this so they match the Staples page defaults. */
export const DEFAULT_STAPLE_FILTERS: StapleFilters = {
  search: "", elements: [], keywords: [], keywordMode: "any", type: "", cardClass: "", level: "",
  costKind: "reserve", maxCost: "", minDecks: 5, sort: "usage",
};
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

/** Cohort for one period/format/champion selection. Missing championCard means "all builds". */
export function findStapleCohort(data: CardStaplesData, period: StaplePeriod, format: string | null, champion: string | null, championCard: string | null): StapleCohort | undefined {
  return data.cohorts.find(c => c.period === period && c.format === format && c.champion === champion && (c.championCard ?? null) === (champion ? championCard : null));
}

/** Champion-card builds that have a cohort, most-played first, for one period/format/champion. */
export function stapleChampionBuilds(data: CardStaplesData, period: StaplePeriod, format: string | null, champion: string): { card: string; decks: number }[] {
  return data.cohorts
    .filter(c => c.period === period && c.format === format && c.champion === champion && c.championCard)
    .map(c => ({ card: c.championCard!, decks: c.decks }))
    .sort((a, b) => b.decks - a.decks || a.card.localeCompare(b.card));
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

/** Pool full-archive observations, preserving source-local populations and tournament results.
 * Sources do not expose cross-source identities or copy histograms: typical copies are
 * unavailable in the blend (zero sentinel; callers show average copies instead).
 */
export function blendCardStaples(tournament: CardStaplesData, community: CardStaplesData): CardStaplesData {
  const cards: StapleCard[] = [];
  const indexes = new Map<string, number>();
  const sectionPatterns: number[][] = [];
  const cohorts = new Map<string, StapleCohort>();
  for (const source of [tournament, community]) {
    const remap = source.cards.map(card => {
      let index = indexes.get(card.id);
      if (index === undefined) { index = cards.length; indexes.set(card.id, index); cards.push(card); }
      return index;
    });
    const offset = sectionPatterns.length;
    sectionPatterns.push(...(source.sectionPatterns ?? []).map(pattern => pattern.map(index => remap[index])));
    for (const cohort of source.cohorts.filter(value => value.period === "all")) {
      const key = JSON.stringify([cohort.format, cohort.champion, cohort.championCard ?? null]);
      let target = cohorts.get(key);
      if (!target) {
        target = { ...cohort, decks: 0, sections: { main: { decks: 0, rows: [], populations: [] }, material: { decks: 0, rows: [], populations: [] }, sideboard: { decks: 0, rows: [], populations: [] } } };
        cohorts.set(key, target);
      }
      target.decks += cohort.decks;
      for (const section of STAPLE_SECTIONS) {
        const input = cohort.sections[section], output = target.sections[section];
        output.decks += input.decks;
        if (!source.sectionPatterns || !input.populations) output.populations = undefined;
        else output.populations?.push(...input.populations.map(([pattern, count]): [number, number] => [pattern + offset, count]));
        const rows = new Map(output.rows.map(row => [row[0], row]));
        for (const row of input.rows) {
          const index = remap[row[0]], previous = rows.get(index);
          if (previous) { previous[1] += row[1]; previous[2] += row[2]; }
          else { const added: StapleRow = [index, row[1], row[2], 0, source === tournament ? row[4] : 0, source === tournament ? row[5] : null]; output.rows.push(added); rows.set(index, added); }
        }
      }
    }
  }
  return { generatedAt: [tournament.generatedAt, community.generatedAt].sort()[0], throughDate: tournament.throughDate, cards, cohorts: [...cohorts.values()], sectionPatterns };
}

/** One card of a champion package. Inclusion values are fractions of the build's decks. */
export interface ChampionPackageCard {
  name: string;
  section: "main" | "material";
  /** Share of all recorded standard decks of this build that contain the card. */
  allInclusion: number;
  /** Share of the last-90-day decks. Equal to allInclusion's meaning, never blended with it. */
  recentInclusion: number | null;
  /** Most common quantity among decks that contain the card (all recorded decks). */
  usualCopies: number;
}
/** An exact quantity pattern of the core, observed in decks that contain every core card. */
export interface ChampionPackageVariant {
  /** Copies per core card, in the same order as `core`. */
  copies: number[];
  decks: number;
  recentDecks: number;
}
/** Cards one champion build plays together, measured from the decks that hold them together. */
export interface ChampionPackage {
  /** Absent for the full build package; otherwise restricts its card pool. */
  element?: string;
  champion: string;
  championCard: string | null;
  decks: number;
  recentDecks: number;
  /** Which window defined the core: recent decks when there are enough, otherwise all decks. */
  basis: "recent" | "all";
  core: ChampionPackageCard[];
  options: ChampionPackageCard[];
  /** Decks (all / last 90 days) that contain every core card. */
  completeDecks: number;
  completeRecentDecks: number;
  variants: ChampionPackageVariant[];
}
export interface ChampionPackagesData {
  generatedAt: string;
  throughDate: string | null;
  format: string;
  packages: ChampionPackage[];
}

export const CHAMPION_PACKAGE_SETTINGS = {
  minDecks: 100, minRecentDecks: 30, coreInclusion: 0.75, optionInclusion: 0.25, maxCore: 16, maxOptions: 12, minComplete: 25, maxVariants: 5,
} as const;
