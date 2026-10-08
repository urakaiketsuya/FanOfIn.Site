import { KEYWORD_PATTERNS, STAPLE_SECTIONS, shrinkWinRate, type CardStaplesData, type StapleCard, type StapleCohort, type StaplePeriod, type StapleRow, type StapleSection } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import { normalizeCardKey, resolveCard, type CardSignature } from "../cards/catalog.js";
import { buildDeckSignature } from "./decklists.js";
import { config } from "../config.js";

type Accum = { decks: number; copies: number; quantities: Map<number, number>; winSum: number; winN: number };
type Bucket = { populations: Record<StapleSection, Map<number, number>>; cohort: StapleCohort; cards: Record<StapleSection, Map<number, Accum>> };
const DAY = 86_400_000;

export function computeCardStaples(bundles: OmnidexEventBundle[], catalog: Map<string, CardSignature>, generatedAt = new Date().toISOString()): CardStaplesData {
  // Latest snapshot wins before aggregation, including when an event loses public deck access.
  const events = new Map<number, OmnidexEventBundle>();
  for (const bundle of bundles) {
    const old = events.get(bundle.id);
    if (!old || bundle.fetchedAt > old.fetchedAt) events.set(bundle.id, bundle);
  }
  const completed = [...events.values()].filter(b => b.event.status === "complete" && Number.isFinite(Date.parse(b.event.date)))
    .sort((a, b) => a.id - b.id);
  const reference = completed.length ? Math.max(...completed.map(b => Date.parse(b.event.date))) : null;
  const observations: StapleObservation[] = [];
  for (const bundle of completed) {
    if ("error" in bundle.decklists) continue;
    const wins = new Map<number, number>();
    if (!("error" in bundle.standings)) for (const result of bundle.standings.standings) {
      const total = result.statsWins + result.statsLosses + result.statsTies;
      if (result.id !== undefined && total > 0) wins.set(result.id, (result.statsWins + result.statsTies * 0.5) / total);
    }
    const age = (reference! - Date.parse(bundle.event.date)) / DAY;
    const periods: StaplePeriod[] = ["all", ...(age < 90 ? ["90" as const] : []), ...(age < 30 ? ["30" as const] : [])];
    // One event/player observation, even if the response repeats that player's entry.
    const entries = new Map(bundle.decklists.map(e => [e.player, e]));
    for (const entry of entries.values()) {
      if (entry.visible === false) continue;
      const raw = entry.decklist;
      if (!raw) continue;
      observations.push({ raw, format: bundle.event.format || "Unknown format", periods, win: wins.get(entry.player) });
    }
  }
  return aggregateStaples(observations, catalog, generatedAt, reference === null ? null : new Date(reference).toISOString().slice(0, 10));
}

export interface StapleObservation {
  raw: Partial<Record<StapleSection, { card: string; quantity: number }[]>>;
  format: string;
  periods: StaplePeriod[];
  win?: number;
}

/** Common section counting for tournament observations and unique community lists. */
export function aggregateStaples(observations: StapleObservation[], catalog: Map<string, CardSignature>, generatedAt: string, throughDate: string | null): CardStaplesData {
  const cards: StapleCard[] = [];
  const cardIds = new Map<string, number>();
  const buckets = new Map<string, Bucket>();
  const sectionPatterns: number[][] = [];
  const patternIds = new Map<string, number>();
  function cardNumber(raw: string): number {
    const card = resolveCard(catalog, raw);
    const id = card?.slug ?? `unknown:${normalizeCardKey(raw)}`;
    const existing = cardIds.get(id);
    if (existing !== undefined) return existing;
    const index = cards.length;
    cardIds.set(id, index);
    cards.push({ id, name: card?.name ?? raw.trim(), slug: card?.slug ?? null,
      elements: card?.elements ?? [], types: card?.types ?? [], classes: card?.classes ?? [],
      keywords: card?.effect ? KEYWORD_PATTERNS.filter(({ re }) => re.test(card.effect!)).map(({ keyword }) => keyword) : [],
      championLevel: card?.types.includes("CHAMPION") ? card.level : null,
      memoryCost: card?.cost_memory ?? null, reserveCost: card?.cost_reserve ?? null });
    return index;
  }
  function bucket(period: StaplePeriod, format: string | null, champion: string | null): Bucket {
    const key = JSON.stringify([period, format, champion]);
    let result = buckets.get(key);
    if (!result) {
      result = { populations: { main: new Map(), material: new Map(), sideboard: new Map() }, cohort: { period, format, champion, decks: 0, sections: { main: { decks: 0, rows: [] }, material: { decks: 0, rows: [] }, sideboard: { decks: 0, rows: [] } } },
        cards: { main: new Map(), material: new Map(), sideboard: new Map() } };
      buckets.set(key, result);
    }
    return result;
  }
  for (const { raw, format, periods, win } of observations) {
    const signature = buildDeckSignature(0, { main: raw.main ?? [], material: raw.material ?? [], sideboard: raw.sideboard ?? [] }, catalog);
    const champion = signature.championName ?? "Unknown champion";
    const targets = periods.flatMap(period => [null, format].flatMap(format =>
      [null, champion].map(name => bucket(period, format, name))));
    for (const target of targets) target.cohort.decks++;
    for (const section of STAPLE_SECTIONS) {
      // Absent is unknown; an explicit [] is a reported empty section.
      if (!Array.isArray(raw[section])) continue;
      const copies = new Map<number, number>();
      for (const line of raw[section]) {
        if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
        const id = cardNumber(line.card);
        copies.set(id, (copies.get(id) ?? 0) + line.quantity);
      }
      const pattern = [...copies.keys()].sort((a, b) => a - b);
      const key = JSON.stringify(pattern);
      let patternId = patternIds.get(key);
      if (patternId === undefined) {
        patternId = sectionPatterns.length;
        patternIds.set(key, patternId);
        sectionPatterns.push(pattern);
      }
      for (const target of targets) {
        target.populations[section].set(patternId, (target.populations[section].get(patternId) ?? 0) + 1);
        target.cohort.sections[section].decks++;
        for (const [id, quantity] of copies) {
          let a = target.cards[section].get(id);
          if (!a) { a = { decks: 0, copies: 0, quantities: new Map(), winSum: 0, winN: 0 }; target.cards[section].set(id, a); }
          a.decks++; a.copies += quantity;
          a.quantities.set(quantity, (a.quantities.get(quantity) ?? 0) + 1);
          if (win !== undefined) { a.winSum += win; a.winN++; }
        }
      }
    }
  }
  const cohorts = [...buckets.values()].map(({ cohort, cards: sections, populations }) => {
    for (const section of STAPLE_SECTIONS) cohort.sections[section].populations = [...populations[section]];
    for (const section of STAPLE_SECTIONS) cohort.sections[section].rows = [...sections[section]].map(([id, a]): StapleRow => {
      const typical = [...a.quantities].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
      const rate = a.winN ? shrinkWinRate(a.winSum, a.winN, config.winRateShrinkagePriorWeight).adjustedWinRate : null;
      return [id, a.decks, a.copies, typical, a.winN, rate === null ? null : Math.round(rate * 1e6) / 1e6];
    }).sort((a, b) => b[1] - a[1] || cards[a[0]].name.localeCompare(cards[b[0]].name));
    return cohort;
  });
  return { generatedAt, throughDate, cards, cohorts, sectionPatterns };
}
