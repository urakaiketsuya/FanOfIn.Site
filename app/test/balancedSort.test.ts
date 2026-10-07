import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balancedSort } from '../../shared/src/balancedSort.js';
const price = (a: Row, b: Row) => (a.price ?? Infinity) === (b.price ?? Infinity) ? 0 : (a.price ?? Infinity) - (b.price ?? Infinity);
type Row = { id: string; price: number | null; placement: number };
const placement = (a: Row, b: Row) => a.placement - b.placement;
test('placement changes price-ranked results even when all prices differ', () => {
  const rows: Row[] = [
    { id: 'cheap', price: 70, placement: 90 },
    { id: 'balanced', price: 120, placement: 1 },
    { id: 'expensive', price: 200, placement: 30 },
  ];
  assert.deepEqual(balancedSort(rows, price, placement).map(r => r.id), ['balanced', 'cheap', 'expensive']);
  assert.deepEqual(rows.map(r => r.id), ['cheap', 'balanced', 'expensive']);
});
test('ties get equal ranks and primary resolves equal combined scores', () => {
  const rows: Row[] = [
    { id: 'a', price: 10, placement: 2 }, { id: 'b', price: 10, placement: 1 },
    { id: 'unknown', price: null, placement: 3 },
  ];
  assert.deepEqual(balancedSort(rows, price, placement).map(r => r.id), ['b', 'a', 'unknown']);
  assert.deepEqual(balancedSort([...rows].reverse(), price, placement).map(r => r.id), ['b', 'a', 'unknown']);
  assert.deepEqual(balancedSort(rows.slice(0, 1), price, placement), rows.slice(0, 1));
  assert.deepEqual(balancedSort([], price, placement), []);
  const opposed = [rows[0], { id: 'c', price: 20, placement: 1 }];
  assert.equal(balancedSort(opposed, price, placement)[0].id, 'a');
});
