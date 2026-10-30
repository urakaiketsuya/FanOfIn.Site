import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DeckCardIndexData, DeckPopularityEntry, OmnidexEventSummary } from '@gatcg/shared';
import { metagameReport } from '../src/features/metagame/report';
const events = [{ id: 1, format: 'standard', status: 'complete', date: '2026-10-20' }, { id: 2, format: 'draft', status: 'complete', date: '2026-10-20' }, { id: 3, format: 'standard', status: 'complete', date: '2025-01-01' }] as OmnidexEventSummary[];
const entries = ['1:a', '1:b', '1:c', '2:a', '3:a'].map((deckId, i) => ({ deckId, eventId: Number(deckId.split(':')[0]), championName: i === 1 ? 'Rai' : 'Alice' })) as DeckPopularityEntry[];
const index: DeckCardIndexData = { generatedAt: '2026-10-29', cardNames: ['A', 'B'], decks: [
  { deckId: '1:a', main: [[0, 2], [0, 1]], material: [[1, 1]], sideboard: [[0, 2]] },
  { deckId: '1:b', main: [[0, 1], [1, 3]], material: [], sideboard: [] },
  { deckId: '2:a', main: [[1, 4]], material: [], sideboard: [] },
  { deckId: '3:a', main: [[1, 4]], material: [], sideboard: [] },
] };
test('counts registrations once, merges repeated names, separates sections and retains empty sideboards in denominator', () => {
  const result = metagameReport({ ...index, decks: [...index.decks, index.decks[0]] }, entries, events, { format: 'standard', days: 90, champion: '' }, '2026-10-29');
  assert.equal(result.decks, 2); assert.equal(result.events, 1); assert.equal(result.missing, 1); assert.equal(result.sideboards, 1);
  assert.deepEqual(result.sections.main[0], { name: 'A', decks: 2, copies: 4 });
  assert.deepEqual(result.sections.sideboard, [{ name: 'A', decks: 1, copies: 2 }]);
});
test('champion scope and all-time period retain their own denominators', () => {
  const result = metagameReport(index, entries, events, { format: 'standard', days: 0, champion: 'Alice' }, '2026-10-29');
  assert.equal(result.decks, 2); assert.equal(result.events, 2);
  assert.deepEqual(result.sections.main.map(r => r.decks), [1, 1]);
});
test('unavailable champion is empty, future and unfinished events do not enter scope', () => {
  const result = metagameReport(index, entries, events.map(e => ({ ...e, status: 'in-progress' })), { format: 'standard', days: 90, champion: '' }, '2026-10-29');
  assert.equal(result.decks, 0);
  assert.equal(metagameReport(index, entries, events, { format: 'standard', days: 0, champion: 'Missing' }, '2026-10-29').decks, 0);
  assert.equal(metagameReport(index, entries, events, { format: 'standard', days: 90, champion: '' }, '2026-01-01').decks, 0);
});
