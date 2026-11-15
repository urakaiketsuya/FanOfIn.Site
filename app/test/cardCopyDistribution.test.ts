import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardCopyDistribution } from '../src/features/cards/CardInfoPanel';

const bucket = (quantity: number, deckCount: number) => ({ quantity, deckCount, avgWinRate: .5, adjustedWinRate: .5 });
test('copy distribution includes low-count observations with the playing-list denominator', () => {
  const html = renderToStaticMarkup(createElement(CardCopyDistribution, { buckets: [bucket(4, 9), bucket(1, 1)] }));
  assert.match(html, /10 recorded lists playing this card/);
  assert.match(html, /10.0%/);
  assert.match(html, /90.0%/);
  assert.ok(html.indexOf('1 copy') < html.indexOf('4 copies'));
  assert.doesNotMatch(html, /win rate|<details|NaN|Infinity/);
});
test('single-quantity and unavailable distributions are distinct', () => {
  assert.match(renderToStaticMarkup(createElement(CardCopyDistribution, { buckets: [bucket(4, 1)] })), /100.0%/);
  const html = renderToStaticMarkup(createElement(CardCopyDistribution, { buckets: [] }));
  assert.match(html, /Copy distribution unavailable/);
  assert.doesNotMatch(html, /0.0%|NaN|Infinity/);
});
