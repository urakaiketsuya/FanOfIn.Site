import test from 'node:test';
import assert from 'node:assert/strict';
import { impactChange, impactValue } from '../src/features/analytics/swapImpactPresentation';
import type { ImpactRow } from '../src/features/analytics/swapImpact';

const row: ImpactRow = { id: 'champion-self', turn: 5, label: 'Self-inflicted damage', unit: 'damage', before: { low: 0, median: 2, high: 5 }, after: { low: 1, median: 4, high: 7 } };
test('direction stays neutral for self-damage and reversed comparisons', () => {
  assert.equal(impactChange(row), '+2 damage median');
  assert.equal(impactChange({ ...row, before: row.after, after: row.before }), '−2 damage median');
});
test('unchanged median preserves a changed outcome range', () => {
  assert.equal(impactChange({ ...row, after: { ...row.after, median: 2 } }), 'Range changed');
  assert.equal(impactChange({ ...row, after: row.before }), 'Same median');
  assert.equal(impactValue(row, row.before), '0–5 damage · 2 median');
});
test('chance differences use percentage points and small changes never become signed zero', () => {
  const chance = { ...row, probability: true, unit: 'pp', before: { low: 50, median: 50, high: 50 }, after: { low: 55, median: 55, high: 55 } };
  assert.equal(impactChange(chance), '+5 pp');
  assert.equal(impactValue(chance, chance.after), '55%');
  assert.equal(impactChange({ ...chance, after: chance.before }), 'Same chance');
  assert.equal(impactChange({ ...chance, after: { low: 50.01, median: 50.01, high: 50.01 } }), '+<0.1 pp');
  assert.equal(impactChange({ ...chance, after: { low: 49.99, median: 49.99, high: 49.99 } }), '−<0.1 pp');
});
