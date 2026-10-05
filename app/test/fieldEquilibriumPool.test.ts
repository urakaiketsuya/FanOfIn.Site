import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeCoveredField, selectFieldEquilibriumPool } from '../../shared/src/fieldEquilibriumPool';
import { benchmarkFieldEquilibrium } from '../../shared/src/fieldEquilibrium';
const field = [{ champion: 'A', weight: 40 }, { champion: 'B', weight: 30 }, { champion: 'C', weight: 20 }, { champion: 'D', weight: 10 }];
const pair = (a: string, b: string) => ({ a, b, aWins: 3, bWins: 2, ties: 0, games: 5 });
const chart = [pair('A', 'B'), pair('A', 'C'), pair('A', 'D'), pair('B', 'D')];
test('pool is fully covered and exclusions explain gaps against the final pool', () => {
  const result = selectFieldEquilibriumPool(field, chart);
  assert.deepEqual(result.included, ['A', 'B', 'D']);
  assert.deepEqual(result.excluded, [{ champion: 'C', share: .2, missingAgainst: ['B', 'D'] }]);
  assert.equal(result.retainedFieldShare, .8);
  assert.equal(result.usable, true);
  assert.equal(benchmarkFieldEquilibrium(result.included, chart, 100)!.missingPairs, 0);
});
test('input order, duplicated identities, and outcomes cannot change selection', () => {
  const expected = selectFieldEquilibriumPool(field, chart);
  assert.deepEqual(selectFieldEquilibriumPool([...field].reverse(), [...chart].reverse()), expected);
  assert.deepEqual(selectFieldEquilibriumPool([{ champion: 'A', weight: 20 }, { champion: 'A', weight: 20 }, ...field.slice(1)], chart), expected);
  assert.deepEqual(selectFieldEquilibriumPool(field, chart.map(row => ({ ...row, aWins: 0, bWins: 5 }))), expected);
});
test('ties use names; zero weights are excluded; no evidence is not a usable benchmark', () => {
  const result = selectFieldEquilibriumPool([{ champion: 'B', weight: 1 }, { champion: 'A', weight: 1 }, { champion: 'C', weight: 0 }], []);
  assert.deepEqual(result.included, ['A']);
  assert.equal(result.usable, false);
  assert.equal(result.retainedFieldShare, .5);
  assert.equal(selectFieldEquilibriumPool([], []).retainedFieldShare, 0);
  assert.equal(selectFieldEquilibriumPool(field, [{ ...pair('A', 'B'), games: 10 }]).usable, false);
});
test('invalid weights fail rather than silently changing the candidate pool', () => {
  for (const weight of [-1, NaN, Infinity]) assert.throws(() => selectFieldEquilibriumPool([{ champion: 'A', weight }], []));
});

test('combined analysis retains every excluded response and returns no strategy for sparse scopes', () => {
  const result = analyzeCoveredField(field, chart);
  assert.equal(result.benchmark!.missingPairs, 0);
  assert.deepEqual(result.responses.map(row => row.champion), ['C']);
  assert.deepEqual(result.responses[0].missing.sort(), ['B', 'D']);
  assert.ok(result.responses[0].lower <= result.responses[0].upper);
  assert.equal(analyzeCoveredField(field, []).benchmark, null);
  assert.deepEqual(analyzeCoveredField([], []).responses, []);
});
