import type { OmnidexDecklist } from './omnidex-types.js';
import type { PriceData } from './pricing.js';
import { priceKey } from './pricing.js';
import { deckBuildSignature } from './collected-decks.js';
import { shrinkWinRate } from './winRateShrinkage.js';

export const BUDGET_PRICE_MAX_AGE_DAYS = 10;
export const BUDGET_HISTORY_DAYS = 180;
const DAY = 86_400_000;
// Catalog set labels and TCGCSV abbreviations differ. Name-check every joined product.
const PRICE_SET_ALIASES: Record<string, string> = {
  DTR: 'DTR1E', 'DTR 1st': 'DTR1E', 'DTR Alter': 'DTRAE', AMB: 'AMB1E', 'AMB 1st': 'AMB1E',
  'PTM 1st': 'PTM', 'RDO 1st': 'RDO', 'PRD 1st': 'PRD', 'ALC 1st': 'ALC', 'MRC 1st': 'MRC', 'HVN 1st': 'HVN',
  'MRC Alter': 'MH Alter', 'ReC-AUR': 'AURR', 'ReC-BRV': 'BRLVST', 'ReC-IDY': 'IDLCRS', 'ReC-HVF': 'HVNFV',
};
export interface BudgetSectionPrice { total: number; missingCards: string[] }
export interface BudgetDeckEntry {
  deckId: string; eventId: number; player: number; eventName: string; eventDate: string;
  championName: string; format: 'STANDARD'; decklist: OmnidexDecklist;
  wins: number; losses: number; ties: number;
  prices: Record<'main' | 'material' | 'sideboard', BudgetSectionPrice>;
}
export interface BudgetDeckData {
  generatedAt: string; pricesAsOf: string | null; historyDays: number;
  audit: { publicLists: number; eligibleLists: number; incompletePrices: number; excludedLists: number };
  entries: BudgetDeckEntry[];
}
/** Released printings only; compare both finishes. Missing/invalid quotes never mean free. */
export function budgetCardPrices(cards: readonly { name: string; editions: { setPrefix: string; collectorNumber: string; releaseDate: string }[] }[], data: PriceData, now: number): Map<string, number> {
  const prices = new Map<string, number>();
  for (const card of cards) for (const edition of card.editions) {
    const released = Date.parse(edition.releaseDate);
    if (!Number.isFinite(released) || released > now) continue;
    const quote = data.prices[priceKey(PRICE_SET_ALIASES[edition.setPrefix] ?? edition.setPrefix, edition.collectorNumber)];
    if (!quote || (quote.cardName !== card.name && !quote.cardName.startsWith(`${card.name} (`))) continue;
    for (const amount of [quote?.normal?.market, quote?.foil?.market]) {
      if (amount == null || !Number.isFinite(amount) || amount < 0) continue;
      prices.set(card.name, Math.min(prices.get(card.name) ?? Infinity, amount));
    }
  }
  return prices;
}
export function budgetSectionPrice(lines: OmnidexDecklist['main'], prices: ReadonlyMap<string, number>): BudgetSectionPrice {
  let cents = 0;
  const missing = new Set<string>();
  for (const line of lines) {
    const price = prices.get(line.card);
    if (price === undefined || !Number.isFinite(price) || price < 0) missing.add(line.card);
    else cents += Math.round(price * 100) * line.quantity;
  }
  return { total: cents / 100, missingCards: [...missing].sort() };
}
export function budgetPricesFresh(pricesAsOf: string | null, now: number): boolean {
  const timestamp = Date.parse(pricesAsOf ?? '');
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp <= BUDGET_PRICE_MAX_AGE_DAYS * DAY;
}
export interface BudgetRecommendation {
  signature: string; entry: BudgetDeckEntry; total: number;
  wins: number; losses: number; ties: number; matches: number; players: number; events: number;
  adjustedWinRate: number; established: boolean;
}
export type BudgetOrder = 'evidence' | 'price';
export function budgetEntrySignature(entry: BudgetDeckEntry): string {
  return JSON.stringify([entry.format, deckBuildSignature(entry.decklist.main.map(l => ({ name: l.card, quantity: l.quantity })), entry.decklist.material.map(l => ({ name: l.card, quantity: l.quantity })))]);
}
export function budgetRegistrationEligible(entry: BudgetDeckEntry): boolean {
  return Object.values(entry.prices).every(p => !p.missingCards.length) && entry.wins > entry.losses && entry.wins + entry.losses + entry.ties >= 5;
}
export function recommendBudgetDecks(data: BudgetDeckData, options: { maxPrice: number; days: number; champion: string; order: BudgetOrder; now: number }): BudgetRecommendation[] {
  if (!budgetPricesFresh(data.pricesAsOf, options.now) || !Number.isFinite(options.maxPrice) || options.maxPrice < 0 || !Number.isFinite(options.days) || options.days <= 0) return [];
  const groups = new Map<string, BudgetDeckEntry[]>();
  const seen = new Set<string>();
  for (const entry of data.entries) {
    const date = Date.parse(entry.eventDate);
    if (seen.has(entry.deckId) || !Number.isFinite(date) || date > options.now || date < options.now - Math.min(options.days, data.historyDays) * DAY || (options.champion && entry.championName !== options.champion)) continue;
    seen.add(entry.deckId);
    const signature = budgetEntrySignature(entry);
    const group = groups.get(signature) ?? [];
    group.push(entry); groups.set(signature, group);
  }
  const results: BudgetRecommendation[] = [];
  const total = (e: BudgetDeckEntry) => Math.round((e.prices.main.total + e.prices.material.total + e.prices.sideboard.total) * 100) / 100;
  for (const [signature, entries] of groups) {
    // Pick an actual winning registration under budget, retaining its own sideboard and record.
    const affordable = entries.filter(e => budgetRegistrationEligible(e) && total(e) <= options.maxPrice)
      .sort((a, b) => total(a) - total(b) || b.eventDate.localeCompare(a.eventDate) || a.deckId.localeCompare(b.deckId));
    if (!affordable.length) continue;
    const wins = entries.reduce((n, e) => n + e.wins, 0), losses = entries.reduce((n, e) => n + e.losses, 0), ties = entries.reduce((n, e) => n + e.ties, 0);
    const matches = wins + losses + ties;
    const adjustedWinRate = shrinkWinRate(wins + ties * 0.5, matches, 10).adjustedWinRate;
    if (adjustedWinRate <= 0.5) continue;
    const players = new Set(entries.map(e => e.player)).size, events = new Set(entries.map(e => e.eventId)).size;
    results.push({ signature, entry: affordable[0], total: total(affordable[0]), wins, losses, ties, matches, players, events, adjustedWinRate, established: matches >= 20 && players >= 3 && events >= 3 });
  }
  return results.sort((a, b) => (options.order === 'price' ? a.total - b.total : Number(b.established) - Number(a.established)) || b.adjustedWinRate - a.adjustedWinRate || b.players - a.players || b.events - a.events || a.total - b.total || a.entry.deckId.localeCompare(b.entry.deckId));
}
/** Prefer different champions, then fill with at most two choices per champion. */
export function budgetShortlist(results: BudgetRecommendation[], limit = 6): BudgetRecommendation[] {
  const selected: BudgetRecommendation[] = [];
  for (const maxPerChampion of [1, 2]) for (const result of results) {
    if (selected.length >= limit) return selected;
    if (!selected.includes(result) && selected.filter(r => r.entry.championName === result.entry.championName).length < maxPerChampion) selected.push(result);
  }
  return selected;
}
