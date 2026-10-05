import assert from 'node:assert/strict';
import { test } from 'node:test';
import { benchmarkFieldEquilibrium, solveMatrixGame } from '../../shared/src/fieldEquilibrium';

test('cyclic game recovers uniform equilibrium and value one half', () => {
  const result = solveMatrixGame([[.5, 0, 1], [1, .5, 0], [0, 1, .5]], 100);
  assert.ok(result.gap < 1e-12);
  for (const share of result.rowStrategy) assert.ok(Math.abs(share - 1 / 3) < 1e-12);
  assert.ok(Math.abs(result.lower - .5) < 1e-12);
});
test('dominated and rectangular games produce certified bounds around known value', () => {
  const result = solveMatrixGame([[.8, .6, .7], [.2, .1, .3]]);
  assert.ok(result.lower <= .6 && result.upper >= .6);
  assert.ok(result.gap < .02);
  assert.ok(result.rowStrategy[0] > .98);
  assert.ok(result.columnStrategy[1] > .95);
});
test('asymmetric mixed equilibrium has correct weights and value', () => {
  const result = solveMatrixGame([[1, 0], [0, .5]]);
  assert.ok(result.lower <= 1 / 3 && result.upper >= 1 / 3);
  assert.ok(result.gap < .02);
  assert.ok(Math.abs(result.rowStrategy[0] - 1 / 3) < .02);
});
test('unknown opponents widen bounds, mirrors are fixed, candidates are stable', () => {
  const result = benchmarkFieldEquilibrium(['B', 'A', 'A'], [], 100)!;
  assert.equal(result.missingPairs, 1);
  assert.ok(Math.abs(result.guaranteedScore - .25) < 1e-12);
  assert.ok(Math.abs(result.possibleScore - .75) < 1e-12);
  assert.deepEqual(result.champions, ['A', 'B']);
  assert.equal(benchmarkFieldEquilibrium([], []), null);
  assert.equal(benchmarkFieldEquilibrium(['A'], [])!.guaranteedScore, .5);
});
test('observed reciprocal payoffs use shared shrinkage and preserve complete-game value', () => {
  const result = benchmarkFieldEquilibrium(['A', 'B'], [{ a: 'A', b: 'B', aWins: 90, bWins: 10, ties: 0, games: 100 }])!;
  assert.equal(result.missingPairs, 0);
  assert.ok(result.guaranteedScore <= .5 && result.possibleScore >= .5);
  assert.ok(result.pessimistic.gap < .02);
  assert.ok(result.strategies[0].conservativeShare > .98);
});
test('invalid matrices and budgets fail explicitly', () => {
  for (const matrix of [[], [[]], [[NaN]], [[-1]], [[1.1]], [[0], [0, 1]]]) assert.throws(() => solveMatrixGame(matrix));
  for (const budget of [0, 1.5, Infinity, 1_000_001]) assert.throws(() => solveMatrixGame([[.5]], budget));
});
