import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blendCardStaples, staplePopulation, type CardStaplesData, type StapleFilters } from '@gatcg/shared';
const card = (id: string) => ({ id, name: id, slug: null, elements: [id], keywords: [], types: [], classes: [], championLevel: null, memoryCost: null, reserveCost: null });
function source(reverse = false): CardStaplesData {
  return { generatedAt: '2026-10-13', throughDate: null, cards: (reverse ? ['B', 'A'] : ['A', 'B']).map(card), sectionPatterns: [[0, 1], [0]], cohorts: [{ period: 'all', format: 'standard', champion: null, decks: 3, sections: { main: { decks: 3, populations: [[0, 1], [1, 2]], rows: [[0, 3, 9, 3, reverse ? 0 : 3, reverse ? null : 0.6], [1, 1, 2, 2, 0, null]] }, material: { decks: 3, rows: [], populations: [] }, sideboard: { decks: 0, rows: [], populations: [] } } }] };
}
const filters: StapleFilters = { search: '', elements: ['A'], keywords: [], keywordMode: 'any', type: '', cardClass: '', level: '', costKind: 'reserve', maxCost: '', minDecks: 5, sort: 'usage' };
test('blend remaps dictionaries, pools observations and keeps tournament outcomes', () => {
  const first = source(), second = source(true), before = JSON.stringify([first, second]);
  const blend = blendCardStaples(first, second), stats = blend.cohorts[0].sections.main;
  assert.equal(stats.decks, 6);
  assert.deepEqual(stats.rows[0], [0, 4, 11, 0, 3, 0.6]);
  assert.equal(staplePopulation(blend, stats, filters), 4);
  assert.equal(staplePopulation(blend, stats, { ...filters, elements: ['A', 'B'] }), 6);
  assert.equal(JSON.stringify([first, second]), before);
});
test('missing source patterns do not invent filtered populations', () => {
  const old = source(true); delete old.sectionPatterns;
  const blend = blendCardStaples(source(), old);
  assert.equal(staplePopulation(blend, blend.cohorts[0].sections.main, filters), null);
});
