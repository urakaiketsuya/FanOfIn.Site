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
