import test from 'node:test';
import assert from 'node:assert/strict';
import { chronologicalSplit, evaluatePerformance, type PerformanceRow } from './performanceValidation.js';
const cohort = (): PerformanceRow[] => Array.from({ length: 100 }, (_, i) => ({ id: String(i), event: String(Math.floor(i / 2)), date: `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`, player: String(i % 12), champion: i % 2 ? 'A' : 'B', family: i % 2 ? 'A:Fire' : 'B:Water', identity: String(i % 20), wins: i % 4, losses: 4 - i % 4, ties: 0, diao: [i % 5], analytics: [i % 3 ? i % 4 : null] }));
test('chronological split never divides a date and rejects insufficient history', () => {
  const rows = cohort(); const split = chronologicalSplit(rows);
  assert.ok(split.train.every(r => r.date < split.cutoff));
  assert.ok(split.test.every(r => r.date >= split.cutoff));
  assert.throws(() => chronologicalSplit(rows.slice(0, 2)));
});
test('holdout outcomes cannot affect predicted calibration values', () => {
  const rows = cohort(), { cutoff } = chronologicalSplit(rows);
  const first = evaluatePerformance(rows);
  const changed = evaluatePerformance(rows.map(r => r.date >= cutoff ? { ...r, wins: 4 - r.wins, losses: r.wins } : r));
  for (const key of ['baseline', 'diao', 'analytics', 'combined']) {
    const predictions = (result: typeof first) => result.holdout.models![key].calibration.map(b => [b.decks, b.predicted]);
    assert.deepEqual(predictions(first), predictions(changed));
  }
});
test('unseen cohorts exclude training identities and players; empty subsets remain unavailable', () => {
  const result = evaluatePerformance(cohort());
  assert.equal(result.unseenPlayers.decks, 0);
  assert.equal(result.unseenPlayers.models, null);
  assert.equal(result.unseenExactDecks.decks, 0);
});
test('all-missing and constant predictors remain finite and deterministic', () => {
  const rows = cohort().map(r => ({ ...r, analytics: [null, 1], diao: [1] }));
  const result = evaluatePerformance(rows);
  assert.deepEqual(result, evaluatePerformance(rows));
  assert.equal(result.holdout.models!.analytics.meanSquaredDeckRateError, result.holdout.models!.baseline.meanSquaredDeckRateError);
});
test('a transferable signal improves unseen outcomes rather than merely producing finite scores', () => {
  const rows = cohort().map((r, i) => ({ ...r, champion: 'A', family: 'A:Fire', player: String(i), identity: String(i), wins: i % 2 ? 4 : 0, losses: i % 2 ? 0 : 4, diao: [1], analytics: [i % 2] }));
  const result = evaluatePerformance(rows);
  assert.ok(result.holdout.models!.analytics.meanSquaredDeckRateError < result.holdout.models!.baseline.meanSquaredDeckRateError * .1);
  assert.equal(result.unseenPlayersAndDecks.decks, result.holdout.decks);
});
