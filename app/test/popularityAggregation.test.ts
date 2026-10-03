import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Card, DeckCardIndexData, DeckPopularityIndexData } from '@gatcg/shared';
import { aggregatePopularDecks, getPopularDecks } from '../src/features/popular/popularityAggregation';
const index: DeckCardIndexData = {
  generatedAt: 'cards-1', cardNames: ['Champion', 'Spell', 'Other'],
  decks: [
    { deckId: '1:1', main: [[1, 4]], material: [[0, 1]], sideboard: [] },
    { deckId: '2:2', main: [[1, 2], [1, 2]], material: [[0, 1]], sideboard: [[2, 3]] },
    { deckId: '3:1', main: [[2, 2]], material: [[0, 1]], sideboard: [] },
    { deckId: '4:1', main: [], material: [], sideboard: [[2, 1]] },
  ],
};
const sightings: DeckPopularityIndexData = {
  generatedAt: 'sightings-1', entries: [
    { deckId: '1:1', player: 1, eventId: 1, eventDate: '2026-09-01', championName: 'Champion', placement: 3, winRate: 50, weightedScore: 20 },
    { deckId: '2:2', player: 2, eventId: 2, eventDate: '2026-09-02', championName: 'Champion', placement: 1, winRate: 100, weightedScore: 40 },
    { deckId: '3:1', player: 1, eventId: 3, eventDate: '2026-09-03', championName: 'Champion', placement: null, winRate: 25, weightedScore: 10 },
  ] as DeckPopularityIndexData['entries'],
};
const catalog = [{ name: 'Champion', classes: ['MAGE'], elements: ['NORM'] }, { name: 'Spell', classes: ['MAGE'], elements: ['FIRE'] }] as Card[];
test('grouping preserves identity, ordering, membership and calculated outputs', () => {
  const decks = aggregatePopularDecks(index, sightings, new Map(catalog.map(c => [c.name, c])));
  assert.equal(decks.length, 2);
  assert.deepEqual(decks[0], {
    signature: 'Champion:1|Spell:4', championName: 'Champion', classes: ['MAGE'], elements: ['FIRE'],
    main: [{ name: 'Spell', quantity: 4 }], material: [{ name: 'Champion', quantity: 1 }],
    deckIds: ['1:1', '2:2'], playerCount: 2, sightingCount: 2, eventCount: 2,
    bestPlacement: 1, avgWinRate: 75, avgWeightedScore: 30, lastPlayedDate: '2026-09-02', lastEventId: 2,
  });
  assert.equal(decks[1].signature, 'Champion:1|Other:2');
  assert.equal(decks[1].bestPlacement, null);
});
test('cache survives rereads and invalidates both datasets and catalog classifications', () => {
  const first = getPopularDecks(index, sightings, catalog);
  assert.strictEqual(getPopularDecks(structuredClone(index), structuredClone(sightings), structuredClone(catalog)), first);
  const nextIndex = { ...index, generatedAt: 'cards-2', decks: index.decks.slice(0, 1) };
  const second = getPopularDecks(nextIndex, sightings, catalog);
  assert.equal(second.length, 1);
  assert.notStrictEqual(second, first);
  const nextSightings = { ...sightings, generatedAt: 'sightings-2', entries: [] };
  assert.equal(getPopularDecks(nextIndex, nextSightings, catalog)[0].playerCount, 0);
  assert.deepEqual(getPopularDecks(nextIndex, nextSightings, [])[0].classes, []);
  assert.deepEqual(getPopularDecks(nextIndex, nextSightings, catalog.map(c => ({ ...c, elements: ['WATER'] })))[0].elements, ['WATER']);
});
