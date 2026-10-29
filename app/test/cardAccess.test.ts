import assert from 'node:assert/strict';
import test from 'node:test';
import { cardAccess, copyCountTradeoffs } from '@gatcg/shared';

function choose(n: number, k: number): number { if (k < 0 || k > n) return 0; let value = 1; for (let i = 1; i <= k; i++) value *= (n - i + 1) / i; return value; }
test('access and multiple exposure match exhaustive small-population combinations', () => {
  for (let size = 1; size <= 12; size++) for (let copies = 0; copies <= size; copies++) for (let seen = 0; seen <= size; seen++) {
    const actual = cardAccess(size, copies, seen);
    const exact = (minimum: number) => Array.from({ length: copies + 1 }, (_, hits) => hits < minimum ? 0 : choose(copies, hits) * choose(size - copies, seen - hits) / choose(size, seen)).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(actual.access - exact(1)) < 1e-10);
    assert.ok(Math.abs(actual.multiple - exact(2)) < 1e-10);
  }
});
test('empty, full population, oversized checkpoints and invalid inputs', () => {
  assert.deepEqual(cardAccess(0, 0, 7), { seen: 0, access: 0, multiple: 0 });
  assert.deepEqual(cardAccess(3, 2, 20), { seen: 3, access: 1, multiple: 1 });
  assert.equal(cardAccess(60, 1, 7).multiple, 0);
  assert.throws(() => cardAccess(60, 61, 7), RangeError);
  assert.throws(() => cardAccess(60, 2.5, 7), RangeError);
});
test('fixed-size copy tradeoffs report both percentage-point changes', () => {
  const rows = copyCountTradeoffs(60, 7, 3);
  assert.deepEqual(rows.map(row => row.copies), [1, 2, 3, 4]);
  assert.ok(Math.abs(rows[2].accessGain - (rows[2].access - rows[1].access)) < 1e-12);
  assert.ok(Math.abs(rows[3].multipleGain - (rows[3].multiple - rows[2].multiple)) < 1e-12);
  assert.ok(rows[3].access > rows[2].access && rows[3].multiple > rows[2].multiple);
  assert.deepEqual(copyCountTradeoffs(2, 7, 2).map(row => row.copies), [1, 2]);
  assert.deepEqual(copyCountTradeoffs(60, 7, 6).map(row => row.copies), [1, 2, 3, 4, 6]);
});
