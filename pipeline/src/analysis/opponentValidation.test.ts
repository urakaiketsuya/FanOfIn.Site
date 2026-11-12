import test from 'node:test';
import assert from 'node:assert/strict';
import { collectHistoricalMatches, historicalPredictions, evaluateOpponentPerformance, type HistoricalMatch } from './opponentValidation.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

const match = (id: string, date: string, score = 1): HistoricalMatch => ({ id, date, score, event: id, a: '1', b: '2' });
test('ratings exclude same-date results and freeze throughout holdout', () => {
  const matches = [match('1', '2026-01-01'), match('2', '2026-01-01'), match('3', '2026-01-02'), match('4', '2026-01-03')];
  const first = historicalPredictions(matches, '2026-01-02');
  assert.equal(first.get('1')!.withOpponent, .5);
  assert.equal(first.get('2')!.withOpponent, .5);
  assert.ok(first.get('3')!.withOpponent > first.get('3')!.withoutOpponent);
  assert.deepEqual(first.get('3'), first.get('4'));
  assert.deepEqual(first, historicalPredictions(matches.map(m => m.date >= '2026-01-02' ? { ...m, score: 0 } : m), '2026-01-02'));
  assert.deepEqual(first, historicalPredictions([...matches].reverse(), '2026-01-02'));
});
test('unseen players receive neutral priors and changing earlier outcomes changes later ratings', () => {
  const matches = [match('1', '2026-01-01'), match('2', '2026-01-02')];
  const first = historicalPredictions(matches, '2026-01-02');
  assert.equal(first.get('1')!.knownA, false);
  assert.equal(first.get('2')!.knownB, true);
  assert.ok(historicalPredictions([{ ...matches[0], score: 0 }, matches[1]], '2026-01-02').get('2')!.withOpponent < .5);
});
test('coverage excludes byes, duplicate tables, unfinished matches and invalid team identifiers', () => {
  const pair = (id: number, a: number | string, b?: number, status = 'complete') => ({ id, status, pairing: [{ id: a, status: 'winner' }, ...(b ? [{ id: b, status: 'loser' }] : [])] });
  const round = { stage: 1, round: 1, pairings: [pair(1, 1, 2), pair(2, 3), pair(3, 4, 5, 'pending'), pair(4, 'team', 6)] };
  const bundle = { id: 1, event: { status: 'complete', date: '2026-01-01' }, pairingsByRound: [round, round, { error: 'missing' }] } as unknown as OmnidexEventBundle;
  const result = collectHistoricalMatches([bundle]);
  assert.equal(result.matches.length, 1);
  assert.equal(result.coverage.unavailableRoundResponses, 1);
  assert.equal(result.coverage.invalidPlayerMatches, 1);
  assert.equal(result.coverage.singleSidePairings, 2); // Raw response coverage, before deduplication.
  assert.equal(evaluateOpponentPerformance(result.matches, []).status, 'insufficient-history');
});

test('joined match audit counts each match once and holdout outcomes cannot change fitted predictions', () => {
  const matches = Array.from({ length: 20 }, (_, i) => match(String(i), `2026-01-${String(i + 1).padStart(2, '0')}`, i % 2));
  const decks = matches.flatMap(m => [m.a, m.b].map(player => ({ id: `${m.event}:${player}`, event: m.event, date: m.date, player, champion: 'A', family: 'A:Fire', identity: player, wins: 2, losses: 1, ties: 0, diao: [Number(player)], analytics: [player === '1' ? 1 : null] })));
  const result = evaluateOpponentPerformance(matches, decks);
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready') return;
  assert.equal(result.linkedMatches, 20);
  assert.equal(result.unlinkedMatches, 0);
  const changed = evaluateOpponentPerformance(matches.map(m => m.date >= result.withOpponent.cutoff ? { ...m, score: 1 - m.score } : m), decks);
  assert.equal(changed.status, 'ready');
  if (changed.status !== 'ready') return;
  for (const name of ['baseline', 'diao', 'analytics', 'combined']) {
    const bins = (r: typeof result) => r.withOpponent.holdout.models[name].calibration.map(b => [b.matches, b.predicted]);
    assert.deepEqual(bins(result), bins(changed));
  }
});
