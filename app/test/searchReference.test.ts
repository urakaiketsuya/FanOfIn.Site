import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilterQuery } from '@gatcg/shared';
import { searchReferenceExamples, searchReferenceUrl } from '../src/features/cards/searchReferenceData';
import { emptyFilterState, filterCards } from '../src/features/cards/filters';
import { mergePreviewCards } from '../src/lib/previewCards';
import spoilers from '../../data/reference/card-spoilers-2026-11-01.json';

test('every runnable reference example is valid and survives its browse URL', () => {
 for (const { query } of Object.values(searchReferenceExamples).flat()) {
  assert.equal(parseFilterQuery(query).error, undefined, query);
  const url = new URL(searchReferenceUrl(query), 'https://example.test');
  assert.equal(url.pathname, '/cards');
  assert.equal(url.searchParams.get('q'), query);
 }
});

test('reference numeric and grouping examples agree with printed preview data', () => {
 const cards = mergePreviewCards([], spoilers.cards, true);
 const query = searchReferenceExamples.numeric[0].query;
 const matches = filterCards(cards, { ...emptyFilterState(), name: query });
 const expected = cards.filter(card => card.types.includes('ALLY') && card.cost_reserve != null && card.cost_reserve >= 0 && card.cost_reserve <= 3 && card.power != null && card.power >= 2);
 assert.ok(expected.length > 0);
 assert.deepEqual(matches, expected);
 const grouped = filterCards(cards, { ...emptyFilterState(), name: searchReferenceExamples.boolean[0].query });
 assert.deepEqual(grouped, cards.filter(card => (card.types.includes('ALLY') || card.types.includes('ACTION')) && card.cost_reserve != null && card.cost_reserve >= 0 && card.cost_reserve <= 3));
});
