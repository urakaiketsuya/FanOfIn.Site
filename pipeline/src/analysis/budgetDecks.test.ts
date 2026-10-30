import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetCardPrices, budgetPricesFresh, budgetSectionPrice, budgetShortlist, recommendBudgetDecks, type BudgetDeckData, type BudgetDeckEntry, type PriceData } from '@gatcg/shared';
import { computeBudgetDecks } from './budgetDecks.js';
import { createAnalysisContext } from './context.js';
import { buildCardIndex, type CardSignature } from '../cards/catalog.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

const generatedAt = '2026-10-30T12:00:00.000Z', now = Date.parse(generatedAt);
const quote = (cardName: string, normal: number | null, foil: number | null) => ({ cardName, normal: { low: null, mid: null, high: null, market: normal }, foil: { low: null, mid: null, high: null, market: foil }, tcgplayerProductId: 1, tcgplayerUrl: '' });
test('budget pricing chooses the cheapest released printing/finish and verifies aliased product identity', () => {
  const editions = (setPrefix: string, collectorNumber: string, releaseDate = '2025-01-01') => ({ setPrefix, collectorNumber, releaseDate });
  const prices: PriceData = { generatedAt, prices: { 'DTR1E-001': quote('Card (001)', 20, 3), 'PRD-001': quote('Card', 0.1, null), 'TEST-001': quote('Wrong card', 1, null), 'TEST-002': quote('Zero', 0, null) } };
  const result = budgetCardPrices([{ name: 'Card', editions: [editions('DTR', '001'), editions('PRD', '001', '2026-11-01'), editions('TEST', '001')] }, { name: 'Zero', editions: [editions('TEST', '002')] }], prices, now);
  assert.equal(result.get('Card'), 3); assert.equal(result.get('Zero'), 0);
  assert.deepEqual(budgetSectionPrice([{ card: 'Card', quantity: 4 }, { card: 'Unknown', quantity: 2 }], result), { total: 12, missingCards: ['Unknown'] });
  assert.deepEqual(budgetSectionPrice([], result), { total: 0, missingCards: [] });
  assert.equal(budgetPricesFresh(generatedAt, now), true);
  assert.equal(budgetPricesFresh('2026-10-19', now), false);
  assert.equal(budgetPricesFresh('2026-11-01', now), false);
  assert.equal(budgetPricesFresh(null, now), false);
});

function entry(overrides: Partial<BudgetDeckEntry> = {}): BudgetDeckEntry {
  return { deckId: '1:1', eventId: 1, player: 1, eventName: 'Event', eventDate: '2026-10-20', championName: 'Alpha', format: 'STANDARD', decklist: { main: [{ card: 'Main', quantity: 60 }], material: [{ card: 'Alpha', quantity: 1 }], sideboard: [{ card: 'Side', quantity: 1 }] }, wins: 4, losses: 1, ties: 0, prices: { main: { total: 40, missingCards: [] }, material: { total: 10, missingCards: [] }, sideboard: { total: 5, missingCards: [] } }, ...overrides };
}
function data(entries: BudgetDeckEntry[]): BudgetDeckData { return { generatedAt, pricesAsOf: generatedAt, historyDays: 180, audit: { publicLists: entries.length, eligibleLists: entries.length, incompletePrices: 0, excludedLists: 0 }, entries }; }
const options = { maxPrice: 55, days: 90, champion: '', order: 'evidence' as const, now };
test('cap includes sideboard, rejects missing quotes, stale data, invalid budgets and weak exact lists', () => {
  assert.equal(recommendBudgetDecks(data([entry()]), options).length, 1);
  assert.equal(recommendBudgetDecks(data([entry()]), { ...options, maxPrice: 54.99 }).length, 0);
  assert.equal(recommendBudgetDecks(data([entry()]), { ...options, maxPrice: NaN }).length, 0);
  assert.equal(recommendBudgetDecks({ ...data([entry()]), pricesAsOf: '2026-10-01' }, options).length, 0);
  const missing = entry(); missing.prices.sideboard.missingCards = ['Side'];
  assert.equal(recommendBudgetDecks(data([missing]), options).length, 0);
  assert.equal(recommendBudgetDecks(data([entry({ wins: 3, losses: 0 })]), options).length, 0);
  assert.equal(recommendBudgetDecks(data([entry({ wins: 2, losses: 3 })]), options).length, 0);
  assert.equal(recommendBudgetDecks(data([entry({ eventDate: '2026-01-01' }), entry({ eventDate: '2026-11-01' })]), options).length, 0);
});
test('exact Main + Material evidence stays separate from other lists and displayed registration keeps its own sideboard and results', () => {
  const a = entry(), b = entry({ deckId: '2:2', eventId: 2, player: 2, wins: 3, losses: 2 });
  b.decklist = { ...b.decklist, sideboard: [{ card: 'Different side', quantity: 1 }] };
  b.prices = { ...b.prices, sideboard: { total: 4, missingCards: [] } };
  const unrelated = entry({ deckId: '3:3', wins: 20, losses: 0, decklist: { ...a.decklist, main: [{ card: 'Different main', quantity: 60 }] } });
  const result = recommendBudgetDecks(data([a, a, b, unrelated]), options);
  assert.equal(result.length, 2);
  const match = result.find(r => r.entry.deckId === b.deckId)!;
  assert.equal(match.matches, 10); assert.equal(match.wins, 7); assert.equal(match.players, 2); assert.equal(match.events, 2);
  assert.equal(match.adjustedWinRate, 0.6); assert.equal(match.established, false);
  assert.deepEqual(match.entry.decklist.sideboard, b.decklist.sideboard); assert.equal(match.entry.wins, 3);
});
test('repeated evidence outranks a single lucky run; cheapest mode and diverse shortlist stay deterministic', () => {
  const repeated = [1, 2, 3, 4].map(i => entry({ deckId: `${i}:${i}`, eventId: i, player: i, wins: 3, losses: 2 }));
  const lucky = entry({ deckId: '5:5', championName: 'Beta', wins: 5, losses: 0, decklist: { ...entry().decklist, main: [{ card: 'Other', quantity: 60 }] } });
  lucky.prices = { ...lucky.prices, main: { total: 30, missingCards: [] } };
  const ranked = recommendBudgetDecks(data([...repeated, lucky]), options);
  assert.equal(ranked[0].entry.championName, 'Alpha'); assert.equal(ranked[0].established, true);
  assert.equal(recommendBudgetDecks(data([...repeated, lucky]), { ...options, order: 'price' })[0].entry.championName, 'Beta');
  assert.deepEqual(budgetShortlist(ranked).map(r => r.entry.championName), ['Alpha', 'Beta']);
  assert.equal(recommendBudgetDecks(data([...repeated, lucky]), { ...options, champion: 'Beta' }).length, 1);
});

const cards: CardSignature[] = ['Hero, Champion', ...Array.from({ length: 15 }, (_, i) => `Card ${i}`)].map((name, i) => ({ name, slug: `card-${i}`, classes: [], types: i ? ['ACTION'] : ['CHAMPION'], subtypes: [], elements: ['NORM'], level: i ? null : 1, effect: null, legality: null, editions: [{ setPrefix: 'TEST', collectorNumber: String(i), releaseDate: '2025-01-01' }] }));
function bundle(): OmnidexEventBundle {
  const pair = { id: 1, status: 'complete', pairing: [{ id: 1, status: 'winner' }, { id: 2, status: 'loser' }] };
  return { id: 10, event: { status: 'complete', date: '2026-10-20', format: 'standard', name: 'Test' }, decklists: [{ player: 1, decklist: { main: cards.slice(1).map(card => ({ card: card.name, quantity: 4 })), material: [{ card: cards[0].name, quantity: 1 }], sideboard: [] } }], pairingsByRound: Array.from({ length: 5 }, (_, i) => ({ stage: { id: 1 }, round: { id: i + 1 }, pairings: [pair, pair, { id: 2, status: 'complete', pairing: [{ id: 1, status: 'byed' }] }, { ...pair, id: 'team' }, { ...pair, id: 3, status: 'waiting' }] })) } as unknown as OmnidexEventBundle;
}
test('pipeline counts completed individual matches once per stage/round and ignores byes, team and incomplete matches', () => {
  const b = bundle();
  const prices: PriceData = { generatedAt, prices: Object.fromEntries(cards.map((c, i) => [`TEST-${i}`, quote(c.name, 1, 2)])) };
  const result = computeBudgetDecks([b, b], createAnalysisContext(buildCardIndex(cards)), prices, generatedAt);
  assert.equal(result.entries.length, 1); assert.equal(result.entries[0].wins, 5); assert.equal(result.entries[0].prices.main.total, 60);
  assert.equal(result.audit.publicLists, 1); assert.equal(result.audit.incompletePrices, 0);
  assert.equal(recommendBudgetDecks(result, { ...options, maxPrice: 61 })[0].matches, 5);
  const legacy = bundle();
  legacy.pairingsByRound = legacy.pairingsByRound.map((r, i) => ({ ...r, stage: 1, round: i + 1 }));
  assert.equal(computeBudgetDecks([legacy], createAnalysisContext(buildCardIndex(cards)), prices, generatedAt).entries[0].wins, 5);
});
test('pipeline excludes unrecognized, banned, excessive-copy and non-Standard registrations', () => {
  const ctx = () => createAnalysisContext(buildCardIndex(cards));
  const unknown = bundle(); if (!('error' in unknown.decklists)) unknown.decklists[0].decklist.sideboard.push({ card: 'Unknown', quantity: 1 });
  assert.equal(computeBudgetDecks([unknown], ctx(), null, generatedAt).entries.length, 0);
  const banned = cards.map(c => ({ ...c, legality: { STANDARD: { limit: 0 } } })) as CardSignature[];
  assert.equal(computeBudgetDecks([bundle()], createAnalysisContext(buildCardIndex(banned)), null, generatedAt).entries.length, 0);
  const excess = bundle(); if (!('error' in excess.decklists)) excess.decklists[0].decklist.main[0].quantity = 5;
  assert.equal(computeBudgetDecks([excess], ctx(), null, generatedAt).entries.length, 0);
  const other = bundle(); other.event.format = 'pantheon';
  assert.equal(computeBudgetDecks([other], ctx(), null, generatedAt).entries.length, 0);
});

test('compact publication retains losing records of a qualifying build', () => {
  const a = bundle(), b = bundle(); b.id = 11;
  for (const [index, round] of b.pairingsByRound.entries()) {
    if ('error' in round || index === 0) continue;
    round.pairings = round.pairings.map(pair => pair.id === 1 ? { ...pair, pairing: [{ ...pair.pairing[0], status: 'loser' }, { ...pair.pairing[1], status: 'winner' }] } : pair);
  }
  const prices: PriceData = { generatedAt, prices: Object.fromEntries(cards.map((c, i) => [`TEST-${i}`, quote(c.name, 1, 2)])) };
  const result = computeBudgetDecks([a, b], createAnalysisContext(buildCardIndex(cards)), prices, generatedAt);
  assert.equal(result.entries.length, 2);
  const recommendation = recommendBudgetDecks(result, { ...options, maxPrice: 61 })[0];
  assert.equal(recommendation.wins, 6); assert.equal(recommendation.losses, 4); assert.equal(recommendation.matches, 10);
});
