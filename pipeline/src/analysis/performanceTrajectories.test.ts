import { RAI_DAMAGE_SCENARIOS } from '@gatcg/shared';
import test from 'node:test';
import assert from 'node:assert/strict';
import { trajectoryFeatures, trajectoryValues } from './performanceTrajectories.js';

test('unsupported and missing reports remain unavailable, never zero', () => {
  const values = trajectoryValues({ status: 'unsupported' }, { status: 'missing' });
  assert.equal(values.length, trajectoryFeatures.length);
  assert.ok(values.every(v => v === null));
});

test('scenario extraction preserves supported zeroes and separates ally damage from champion damage', () => {
  const range = (median: number) => ({ low: median, median, high: median });
  const points = [3, 5].map(turn => ({ turn, damage: range(10), allies: range(4), self: range(0), recovery: range(0) }));
  const damage = { status: 'ready' as const, damageSources: [], points, scenarios: RAI_DAMAGE_SCENARIOS.map(({ id, label }) => ({ id, label, damageSources: [], points })) };
  const defense = { status: 'ready' as const, sources: [], scenarios: ['single', 'repeated', 'recovery'].map(id => ({ id, label: id, metric: 'prevention' as const, cards: [], points: [3, 5].map(turn => ({ turn, range: range(0), ready: 0, sources: [] })) })) };
  assert.deepEqual(trajectoryValues(damage, defense), [10, 10, 4, 4, 4, 4, ...Array(12).fill(0)]);
});
