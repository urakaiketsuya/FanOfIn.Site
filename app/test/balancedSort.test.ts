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
test('favor-first weights ranks 2:1 while tie-break never sacrifices the first choice', () => {
  const rows: Row[] = [
    { id: 'a', price: 10, placement: 4 },
    { id: 'b', price: 20, placement: 2 },
    { id: 'c', price: 30, placement: 1 },
    { id: 'd', price: 40, placement: 3 },
  ];
  const ids = (mode: 'equal' | 'favor-first' | 'tie-break') => balancedSort(rows, price, placement, undefined, mode).map(r => r.id);
  assert.deepEqual(ids('equal'), ['b', 'c', 'a', 'd']);
  assert.deepEqual(ids('favor-first'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids('tie-break'), ['a', 'b', 'c', 'd']);
  const tied = [{ id: 'a', price: 10, placement: 3 }, { id: 'b', price: 10, placement: 1 }];
  assert.deepEqual(balancedSort(tied, price, placement, undefined, 'tie-break').map(r => r.id), ['b', 'a']);
});
test('favor-first still permits a stronger second preference to move a result', () => {
  const rows: Row[] = [5, 1, 2, 3, 4].map((placement, index) => ({ id: String(index), price: index + 1, placement }));
  assert.equal(balancedSort(rows, price, placement, undefined, 'favor-first')[0].id, '1');
  assert.equal(balancedSort(rows, price, placement, undefined, 'tie-break')[0].id, '0');
});
