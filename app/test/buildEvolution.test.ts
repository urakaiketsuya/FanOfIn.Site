import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvolution, compareEvolutionSeasons, type DeckCardIndexData, type DeckPopularityIndexData } from '@gatcg/shared';

const cards: DeckCardIndexData = { generatedAt: '', cardNames: ['Core', 'Old', 'New', 'Side'], decks: [
  { deckId: '1:1', main: [[0, 3], [1, 2]], material: [[0, 1]], sideboard: [[3, 4]] },
  { deckId: '3:1', main: [[0, 2], [2, 4]], material: [], sideboard: [] },
] };
const popularity = { entries: [{ deckId: '1:1', eventId: 1 }, { deckId: '1:1', eventId: 1 }, { deckId: '3:1', eventId: 3 }, { deckId: '3:2', eventId: 3 }, { deckId: '4:1', eventId: 4 }] } as DeckPopularityIndexData;
const events = [
  { id: 3, seasonId: 2, seasonName: 'Third', date: '2026-03-01' },
  { id: 1, seasonId: 9, seasonName: 'First', date: '2026-01-01' },
  { id: 2, seasonId: 7, seasonName: 'Gap', date: '2026-02-01' },
  { id: 4, seasonId: null, seasonName: null, date: '2026-04-01' },
];
const builds = [{ id: 'a', name: 'A', deckIds: ['1:1', '3:1', '4:1'] }, { id: 'b', name: 'B', deckIds: ['3:2'] }];

test('season evolution orders by date, preserves gaps, excludes sideboards and deduplicates sightings', () => {
  const seasons = buildEvolution(builds, cards, popularity, events);
  assert.deepEqual(seasons.map(s => s.id), [9, 7, 2]);
  assert.deepEqual(seasons.map(s => s.deckCount), [1, 0, 2]);
  assert.equal(seasons[0].cards.find(c => c.name === 'Core')?.averageCopies, 4);
  assert.ok(!seasons[0].cards.some(c => c.name === 'Side'));
  assert.equal(seasons[2].listedCount, 1);
  assert.equal(seasons[2].cards[0].prevalence, 1);
  assert.deepEqual(seasons[2].builds.map(b => b.share), [0.5, 0.5]);
  const changes = compareEvolutionSeasons(seasons[0], seasons[2]);
  assert.equal(changes.find(c => c.name === 'New')?.status, 'Added');
  assert.equal(changes.find(c => c.name === 'Old')?.status, 'Dropped');
  assert.equal(changes.find(c => c.name === 'Core')?.status, 'Retained');
  assert.deepEqual(compareEvolutionSeasons(seasons[0], seasons[1]), []);
  assert.deepEqual(buildEvolution([], cards, popularity, events), []);
});

test('single-season and unknown-season data do not fabricate comparisons or cards', () => {
  const one = buildEvolution([{ id: 'a', name: 'A', deckIds: ['3:1', '4:1'] }], cards, popularity, events);
  assert.equal(one.length, 1);
  assert.equal(one[0].deckCount, 1);
  assert.ok(compareEvolutionSeasons(one[0], one[0]).every(card => card.status === 'Retained' && card.before === card.after));
  assert.deepEqual(buildEvolution([{ id: 'unknown', name: 'Unknown', deckIds: ['4:1'] }], cards, popularity, events), []);
});
