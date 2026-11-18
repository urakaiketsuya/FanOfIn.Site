import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeBrowseState, encodeBrowseState } from '../src/lib/browseState';

test('browse state retains queries, cleared values, numeric ranges and multi-select filters', () => {
  const state = { query: 'class:mage -element:fire', sort: 'name', classes: new Set(['MAGE', '-WARRIOR']), min: 0, max: null, source: '', enabled: false, cards: ['A', 'B'] };
  assert.deepEqual(decodeBrowseState(encodeBrowseState(state)), state);
  assert.deepEqual(decodeBrowseState(encodeBrowseState(new Set())), new Set());
});
test('invalid saved JSON can be rejected by the browse hook fallback', () => {
  assert.throws(() => decodeBrowseState('{broken'));
});

import { decodeUrlFilters, CARD_FILTER_PARAMS } from '../src/components/filters/useUrlFilters';
test('URL filters decode current browser values without consuming other view parameters', () => {
  const empty = () => ({ name: '', classes: new Set<string>(), sets: new Set<string>(), tags: new Set<string>() });
  const params = new URLSearchParams('q=spirit&class=MAGE&class=-WARRIOR&tab=browse&sort=name');
  const decoded = decodeUrlFilters(empty, '', { name: CARD_FILTER_PARAMS.name, classes: CARD_FILTER_PARAMS.classes }, params);
  assert.equal(decoded.name, 'spirit');
  assert.deepEqual(decoded.classes, new Set(['MAGE', '-WARRIOR']));
  assert.equal(params.get('sort'), 'name');
  assert.equal(params.get('tab'), 'browse');
});
