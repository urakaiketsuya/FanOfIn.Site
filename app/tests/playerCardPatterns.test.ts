import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DeckCardIndexData, DeckPopularityEntry, OmnidexEventSummary } from '@gatcg/shared';
import { playerCardPatterns } from '../src/features/players/cardPatternReport';
const events = [{ id: 1, date: '2026-01-01' }, { id: 2, date: '2026-10-01' }, { id: 3, date: '2026-10-20' }].map(e => ({ ...e, format: 'standard', status: 'complete' })) as OmnidexEventSummary[];
const entries = [{ deckId: '1:1', eventId: 1, player: 1, championName: 'Alice' }, { deckId: '2:1', eventId: 2, player: 1, championName: 'Alice' }, { deckId: '3:1', eventId: 3, player: 1, championName: 'Rai' }, { deckId: '3:2', eventId: 3, player: 2, championName: 'Alice' }] as DeckPopularityEntry[];
const index: DeckCardIndexData = { generatedAt: '2026-10-29', cardNames: ['Old', 'New'], decks: [
  { deckId: '1:1', main: [[0, 4]], material: [], sideboard: [] },
  { deckId: '2:1', main: [[0, 2], [1, 1], [1, 2]], material: [], sideboard: [[0, 1]] },
  { deckId: '3:1', main: [[1, 4]], material: [], sideboard: [] },
  { deckId: '3:2', main: [[1, 4]], material: [], sideboard: [] },
] };
test('defaults to most-played champion, keeps player and section denominators separate', () => {
  const r = playerCardPatterns(index, entries, events, 1, 'standard', null, '2026-10-29');
  assert.equal(r.champion, 'Alice'); assert.equal(r.decks, 2);
  assert.deepEqual(r.sections.main, [{ name: 'Old', decks: 2, copies: 6 }, { name: 'New', decks: 1, copies: 3 }]);
  assert.deepEqual(r.newCards.map(c => [c.name, c.section, c.decks]), [['New', 'main', 1], ['Old', 'sideboard', 1]]);
  assert.equal(r.historyStart, '2026-01-01');
});
test('first seen remains earliest despite input order and repeated registrations', () => {
  const r = playerCardPatterns({ ...index, decks: [...index.decks].reverse().concat(index.decks[1]) }, entries, events, 1, 'standard', 'Alice', '2026-10-29');
  assert.equal(r.newCards.find(c => c.name === 'New')?.eventId, 2);
  assert.equal(r.sections.main[0].decks, 2);
});
test('champion switching and empty format retain truthful history', () => {
  assert.equal(playerCardPatterns(index, entries, events, 1, 'standard', 'Rai', '2026-10-29').newCards[0].date, '2026-10-20');
  const empty = playerCardPatterns(index, entries, events, 1, 'draft', null, '2026-10-29');
  assert.equal(empty.decks, 0); assert.equal(empty.newCards.length, 0);
});
test('compares adjacent periods and excludes the player from the peer baseline', () => {
  const comparisonEvents = [
    { id: 10, date: '2026-10-20' },
    { id: 11, date: '2026-08-01' }, // exact recent-window boundary: previous only
  ].map(e => ({ ...e, format: 'standard', status: 'complete' })) as OmnidexEventSummary[];
  const comparisonEntries: DeckPopularityEntry[] = [];
  const decks: DeckCardIndexData['decks'] = [];
  for (let i = 0; i < 16; i++) {
    const eventId = i < 3 || i >= 6 ? 10 : 11;
    const deckId = `${eventId}:fixture-${i}`;
    comparisonEntries.push({ deckId, eventId, player: i < 6 ? 1 : i, championName: 'Alice' } as DeckPopularityEntry);
    decks.push({ deckId, main: i < 3 ? [[1, 4]] : [[0, 4]], material: [], sideboard: [] });
  }
  const r = playerCardPatterns({ ...index, decks }, comparisonEntries, comparisonEvents, 1, 'standard', 'Alice', '2026-10-30');
  assert.equal(r.recent.decks, 3); assert.equal(r.previous.decks, 3); assert.equal(r.others.decks, 10);
  assert.deepEqual(r.trends.main.map(r => [r.name, r.delta]), [['New', 100], ['Old', -100]]);
  assert.deepEqual(r.signatures.main.map(r => [r.name, r.leftCount, r.rightCount, r.delta]), [['New', 3, 0, 100]]);
  assert.deepEqual(r.trends.sideboard, []);
  const sparse = playerCardPatterns({ ...index, decks: decks.slice(1) }, comparisonEntries, comparisonEvents, 1, 'standard', 'Alice', '2026-10-30');
  assert.deepEqual(sparse.trends.main, []); assert.deepEqual(sparse.signatures.main, []);
});
test('all champions pools only this player and keeps sideboard denominators', () => {
  const r = playerCardPatterns(index, entries, events, 1, 'standard', '', '2026-10-29');
  assert.equal(r.champion, ''); assert.equal(r.decks, 3); assert.equal(r.sideboards, 1);
  assert.deepEqual(r.sections.main, [{ name: 'New', decks: 2, copies: 7 }, { name: 'Old', decks: 2, copies: 6 }]);
  assert.deepEqual(r.sections.sideboard, [{ name: 'Old', decks: 1, copies: 1 }]);
  assert.equal(r.newCards.find(c => c.name === 'New' && c.section === 'main')?.eventId, 2);
  assert.deepEqual(r.uniqueCards.main, []);
});
test('unique choices compare other players on the same champion across all sections and history', () => {
  const r = playerCardPatterns(index, entries, events, 1, 'standard', 'Alice', '2026-10-29');
  assert.equal(r.peers.decks, 1);
  assert.deepEqual(r.uniqueCards.main, [{ name: 'Old', decks: 2, copies: 6 }]);
  assert.deepEqual(r.uniqueCards.sideboard, [{ name: 'Old', decks: 1, copies: 1 }]);
  const oldPeer = { deckId: '1:2', eventId: 1, player: 2, championName: 'Alice' } as DeckPopularityEntry;
  const older = playerCardPatterns({ ...index, decks: [...index.decks, { deckId: '1:2', main: [[0, 1]], material: [], sideboard: [] }] }, [...entries, oldPeer], events, 1, 'standard', 'Alice', '2026-10-29');
  assert.deepEqual(older.uniqueCards.main, []);
  assert.deepEqual(older.uniqueCards.sideboard, []);
  assert.deepEqual(playerCardPatterns(index, entries, events, 1, 'standard', 'Rai', '2026-10-29').uniqueCards.main, []);
});
test('unique choices retain missing peer coverage and ignore other formats and future events', () => {
  const extraEntries = [
    { deckId: '2:3', eventId: 2, player: 3, championName: 'Alice' },
    { deckId: '4:4', eventId: 4, player: 4, championName: 'Alice' },
    { deckId: '5:5', eventId: 5, player: 5, championName: 'Alice' },
  ] as DeckPopularityEntry[];
  const extraEvents = [
    { id: 4, date: '2026-10-01', format: 'draft', status: 'complete' },
    { id: 5, date: '2026-11-01', format: 'standard', status: 'complete' },
  ] as OmnidexEventSummary[];
  const r = playerCardPatterns({ ...index, decks: [...index.decks,
    { deckId: '4:4', main: [[0, 4]], material: [], sideboard: [] },
    { deckId: '5:5', main: [], material: [], sideboard: [[0, 4]] },
  ] }, [...entries, ...extraEntries], [...events, ...extraEvents], 1, 'standard', 'Alice', '2026-10-29');
  assert.equal(r.peers.decks, 1);
  assert.equal(r.peers.missing, 1);
  assert.deepEqual(r.uniqueCards.main.map(row => row.name), ['Old']);
  const unavailable = playerCardPatterns({ ...index, decks: index.decks.filter(d => d.deckId !== '3:2') }, entries, events, 1, 'standard', 'Alice', '2026-10-29');
  assert.equal(unavailable.peers.missing, 1);
  assert.deepEqual(unavailable.uniqueCards.main, []);
});
