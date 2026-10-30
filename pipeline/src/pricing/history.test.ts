import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentProductHistory, PRICE_HISTORY_MAX_POINTS, type PriceData, type PriceHistoryPoint } from '@gatcg/shared';
import { appendPriceHistory } from './history.js';
const point = (id?: number, date = '2026-10-01'): PriceHistoryPoint => ({ tcgplayerProductId: id, date, normalMarket: 1, foilMarket: 2 });
const current: PriceData = { generatedAt: '2026-10-30', prices: { 'PTM-011': { cardName: 'Enfeebling Orb', tcgplayerProductId: 1, tcgplayerUrl: '', normal: { market: .32, low: null, mid: null, high: null }, foil: null } } };
test('history retains old samples, records product provenance, and retries without duplicate points', () => {
  const previous = { 'PTM-011': [point()], 'OTHER-001': [point(3)] };
  const result = appendPriceHistory(previous, current);
  assert.equal(result.history['PTM-011'].length, 2);
  assert.equal(previous['PTM-011'].length, 1);
  assert.equal(result.history['PTM-011'][1].tcgplayerProductId, 1);
  assert.deepEqual(appendPriceHistory(result.history, current), result);
  assert.deepEqual(result.history['OTHER-001'], previous['OTHER-001']);
});
test('trend cannot cross missing provenance, a variant switch, or a switch back', () => {
  const points = [point(), point(1), point(2), point(1), point(1)];
  assert.deepEqual(currentProductHistory(points, 1), points.slice(-2));
  assert.deepEqual(currentProductHistory(points, 2), []);
  assert.deepEqual(currentProductHistory(points, undefined), []);
  assert.deepEqual(currentProductHistory([point(), point()], 1), []);
});
test('history remains bounded', () => {
  const previous = { 'PTM-011': Array.from({ length: PRICE_HISTORY_MAX_POINTS }, (_, i) => point(1, String(i))) };
  const result = appendPriceHistory(previous, current);
  assert.equal(result.history['PTM-011'].length, PRICE_HISTORY_MAX_POINTS);
  assert.equal(result.history['PTM-011'].at(-1)?.date, current.generatedAt);
});
