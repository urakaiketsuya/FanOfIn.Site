import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Card, CardStat } from '@gatcg/shared';
import CardInfoPanel from '../src/features/cards/CardInfoPanel';

const card = { name: 'Example', legality: {}, references: [], referenced_by: [] } as unknown as Card;
function render(loading = false, cardStat?: CardStat) {
  return renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CardInfoPanel, {
    card, loading, cardStat, metaShare: cardStat ? 0 : null, quantityBuckets: [], resolveReference: () => undefined,
  })));
}
test('loading stats never appear as missing data or zero results', () => {
  const html = render(true);
  assert.match(html, /Loading tournament stats/);
  assert.doesNotMatch(html, /No recorded tournament stats|Copy distribution unavailable|0%/);
});
test('no tournament observations have an explicit empty state', () => {
  assert.match(render(), /No recorded tournament stats/);
});
test('a recorded zero win rate remains a valid value', () => {
  const html = render(false, { adjustedWinRate: 0, deckCount: 1, eventCount: 1 } as CardStat);
  assert.match(html, /Adjusted win rate/);
  assert.match(html, />0%/);
  assert.doesNotMatch(html, /No recorded tournament stats/);
});
