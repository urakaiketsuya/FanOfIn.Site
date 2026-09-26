import assert from 'node:assert/strict';
import test from 'node:test';
import { minimumCopies, nextDrawOdds, previewCalculatorSwap, selectedRecipeOdds, countSelectedCopies } from '../src/lib/calculatorDashboard';

test('copies needed returns the minimal solution and detects impossible draw requirements', () => {
  assert.equal(minimumCopies(10, 1, 1, 0.8), 8);
  assert.equal(minimumCopies(10, 2, 2, 1), 10);
  assert.equal(minimumCopies(10, 1, 2, 0.8), null);
  assert.equal(minimumCopies(10, 0, 1, 0.8), null);
  assert.equal(minimumCopies(10, 1, 1, NaN), null);
});
test('swap preserves size and source, merges existing copies and rejects unavailable cuts', () => {
  const source = [{ name: 'A', quantity: 3 }, { name: 'B', quantity: 2 }];
  assert.deepEqual(previewCalculatorSwap(source, 'A', 'B', 2), [{ name: 'A', quantity: 1 }, { name: 'B', quantity: 4 }]);
  assert.deepEqual(previewCalculatorSwap(source, 'A', 'C', 3), [{ name: 'B', quantity: 2 }, { name: 'C', quantity: 3 }]);
  assert.equal(source[0].quantity, 3);
  assert.equal(previewCalculatorSwap(source, 'A', 'B', 4), null);
  assert.equal(previewCalculatorSwap(source, 'A', 'A', 1), null);
});
test('recipe uses joint odds, rejects overlapping pools, and treats removed ingredients as zero access', () => {
  const source = [{ name: 'A', quantity: 2 }, { name: 'B', quantity: 2 }];
  assert.ok(Math.abs(selectedRecipeOdds(source, [['A'], ['B']], 2)! - 2 / 3) < 1e-12);
  assert.equal(selectedRecipeOdds(source, [['A'], ['A']], 2), null);
  assert.equal(selectedRecipeOdds(source, [['A'], ['C']], 2), 0);
  assert.equal(selectedRecipeOdds(source, [], 2), null);
  assert.equal(countSelectedCopies(source, ['A', 'A']), 2);
});

test('next draw conditions on known cards and rejects impossible or exhausted decks', () => {
  assert.equal(nextDrawOdds(60, 4, 10, 1), 3 / 50);
  assert.equal(nextDrawOdds(60, 4, 10, 4), 0);
  assert.equal(nextDrawOdds(60, 4, 60, 4), null);
  assert.equal(nextDrawOdds(60, 4, 2, 3), null);
  assert.equal(nextDrawOdds(60, 4, 59, 0), null);
  assert.equal(nextDrawOdds(60, 4, 10, 5), null);
});
