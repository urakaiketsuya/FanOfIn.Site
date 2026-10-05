import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishedField, scoreExpectedField, stressExpectedField, type BattleChartEntry } from '@gatcg/shared';

const chart: BattleChartEntry[] = [
  { a: 'A', b: 'B', aWins: 60, bWins: 30, ties: 10, games: 100 },
  { a: 'A', b: 'C', aWins: 30, bWins: 60, ties: 10, games: 100 },
];
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('stress envelope contains every redistribution and reaches its endpoints', () => {
  const field = [{ champion: 'B', weight: 1 }, { champion: 'C', weight: 1 }];
  const row = stressExpectedField(['A'], field, chart)[0];
  near(row.stressLower, 0.8 * 0.5 + 0.2 * 40 / 110);
  near(row.stressUpper, 0.8 * 0.5 + 0.2 * 70 / 110);
  assert.deepEqual(row.worstOpponents, ['C']);
  for (let i = 0; i <= 100; i++) {
    const actual = scoreExpectedField(['A'], [{ champion: 'B', weight: 0.4 + 0.2 * i / 100 }, { champion: 'C', weight: 0.6 - 0.2 * i / 100 }], chart)[0];
    assert.ok(actual.lower >= row.stressLower - 1e-12 && actual.upper <= row.stressUpper + 1e-12);
  }
  assert.deepEqual(field, [{ champion: 'B', weight: 1 }, { champion: 'C', weight: 1 }]);
});

test('stress preserves missing bounds, excludes zero weights and merges duplicates', () => {
  const row = stressExpectedField(['A'], [{ champion: 'A', weight: 1 }, { champion: 'D', weight: 0.5 }, { champion: 'D', weight: 0.5 }, { champion: 'C', weight: 0 }], chart)[0];
  near(row.stressLower, 0.2); near(row.stressUpper, 0.8); near(row.stressCoverage, 0.4);
  assert.deepEqual(row.worstOpponents, ['D']);
  const only = stressExpectedField(['A'], [{ champion: 'A', weight: 1 }], chart)[0];
  near(only.stressLower, 0.5); near(only.stressUpper, 0.5);
});

test('stress validates inputs and zero shift preserves baseline ranking exactly', () => {
  const field = [{ champion: 'A', weight: 1 }, { champion: 'B', weight: 2 }];
  const baseline = scoreExpectedField(['A', 'B'], field, chart);
  const zero = stressExpectedField(['A', 'B'], field, chart, 0);
  assert.deepEqual(zero.map(({ stressLower, stressUpper, stressCoverage, worstOpponents, ...row }) => {
    near(stressLower, row.lower); near(stressUpper, row.upper); near(stressCoverage, row.coverage);
    assert.deepEqual(worstOpponents, []); return row;
  }), baseline);
  for (const shift of [-1, 1.1, NaN, Infinity]) assert.deepEqual(stressExpectedField(['A'], field, chart, shift), []);
  for (const weight of [-1, NaN, Infinity, 0]) assert.deepEqual(stressExpectedField(['A'], [{ champion: 'B', weight }], chart), []);
  const full = stressExpectedField(['A'], [{ champion: 'B', weight: 1 }, { champion: 'C', weight: 1 }], chart, 1)[0];
  near(full.stressLower, 40 / 110); near(full.stressUpper, 70 / 110);
});

test('stress ranking favors a consistent score over a vulnerable field leader', () => {
  const payoffs: BattleChartEntry[] = [
    { a: 'A', b: 'X', aWins: 90, bWins: 10, ties: 0, games: 100 },
    { a: 'A', b: 'Y', aWins: 10, bWins: 90, ties: 0, games: 100 },
    { a: 'B', b: 'X', aWins: 75, bWins: 25, ties: 0, games: 100 },
    { a: 'B', b: 'Y', aWins: 75, bWins: 25, ties: 0, games: 100 },
  ];
  const field = [{ champion: 'X', weight: 9 }, { champion: 'Y', weight: 1 }];
  assert.deepEqual(scoreExpectedField(['A', 'B'], field, payoffs).map(row => row.champion), ['A', 'B']);
  assert.deepEqual(stressExpectedField(['A', 'B'], field, payoffs).map(row => row.champion), ['B', 'A']);
});

test('weighted scores react to field shifts and count draws as half', () => {
  const balanced = scoreExpectedField(['A'], [{ champion: 'B', weight: 1 }, { champion: 'C', weight: 1 }], chart)[0];
  near(balanced.lower, 0.5);
  near(balanced.upper, 0.5);
  const shifted = scoreExpectedField(['A'], [{ champion: 'B', weight: 7 }, { champion: 'C', weight: 3 }], chart)[0];
  near(shifted.lower, (7 * 70 / 110 + 3 * 40 / 110) / 10);
  assert.equal(shifted.games, 200);
});

test('opposite directions complement each other, including ties', () => {
  const a = scoreExpectedField(['A'], [{ champion: 'B', weight: 1 }], chart)[0];
  const b = scoreExpectedField(['B'], [{ champion: 'A', weight: 1 }], chart)[0];
  near(a.lower + b.lower, 1);
});

test('unknown matchups remain bounds and mirrors are symmetric without invented matches', () => {
  const row = scoreExpectedField(['A'], [{ champion: 'A', weight: 1 }, { champion: 'D', weight: 1 }], chart)[0];
  near(row.lower, 0.25); near(row.upper, 0.75); near(row.coverage, 0.5);
  assert.equal(row.games, 0); assert.deepEqual(row.missing, ['D']);
  const unknown = scoreExpectedField(['A'], [{ champion: 'D', weight: 1 }], chart)[0];
  assert.equal(unknown.lower, 0); assert.equal(unknown.upper, 1);
});

test('empty, zero and invalid weights cannot produce rankings', () => {
  for (const weight of [0, -1, NaN, Infinity]) assert.deepEqual(scoreExpectedField(['A'], [{ champion: 'B', weight }], chart), []);
  assert.deepEqual(scoreExpectedField(['A'], [], chart), []);
});

test('duplicate identities merge, zero shares are ignored and malformed records remain unknown', () => {
  assert.deepEqual(publishedField([{ signature: 'A', deckCount: 3 }, { signature: 'A', deckCount: 2 }]), [{ champion: 'A', weight: 5 }]);
  const row = scoreExpectedField(['A', 'A'], [{ champion: 'B', weight: 1 }, { champion: 'B', weight: 2 }, { champion: 'D', weight: 0 }], [{ ...chart[0], games: 101 }]);
  assert.equal(row.length, 1); assert.deepEqual(row[0].missing, ['B']);
});
