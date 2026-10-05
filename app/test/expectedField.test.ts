import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publishedField, scoreExpectedField, type BattleChartEntry } from '@gatcg/shared';

const chart: BattleChartEntry[] = [
  { a: 'A', b: 'B', aWins: 60, bWins: 30, ties: 10, games: 100 },
  { a: 'A', b: 'C', aWins: 30, bWins: 60, ties: 10, games: 100 },
];
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

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
