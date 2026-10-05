import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateFieldHistory, backtestFieldHistory, fieldWindowStart, type FieldEvent } from '@gatcg/shared';

function event(id: number, date: string, wins = 8, format = 'standard'): FieldEvent {
  return { id, date, completedDate: date, format, champions: [{ champion: 'A', weight: 1 }, { champion: 'B', weight: 1 }],
    battleChart: [{ a: 'A', b: 'B', aWins: wins, bWins: 10 - wins, ties: 0, games: 10 }] };
}

test('scope includes both boundary days, isolates formats, and applies threshold after pooling', () => {
  const events = [event(1, '2026-01-01'), event(2, '2026-01-02'), event(3, '2026-01-03'), event(4, '2026-01-02', 0, 'team-standard-3v3')];
  const result = aggregateFieldHistory(events, { format: 'standard', from: '2026-01-01', to: '2026-01-02' }, 15);
  assert.equal(result.events, 2); assert.equal(result.battleChart[0].games, 20);
  assert.equal(result.champions[0].weight, 2);
  assert.equal(aggregateFieldHistory(events, { format: 'standard', from: '2026-01-02', to: '2026-01-01' }).events, 0);
  assert.equal(fieldWindowStart('2026-03-01', 2), '2026-02-28');
});

test('walk-forward backtest has hand-calculated errors on identical evaluation rows', () => {
  const result = backtestFieldHistory([event(1, '2026-01-01'), event(2, '2026-01-02')], 'standard');
  // Prior matchup estimate .65; 50% mirror field yields .575; target score .8.
  assert.equal(result.evaluated, 2); assert.equal(result.skipped, 2); assert.equal(result.testedEvents, 1);
  assert.ok(Math.abs(result.expectedFieldMae! - .225) < 1e-10);
  assert.ok(Math.abs(result.historicalMae! - .15) < 1e-10);
});

test('same-day, unfinished, overlapping, other-format and future events never train a target', () => {
  const base = [event(1, '2026-01-01'), event(2, '2026-01-02')];
  const future = event(9, '2026-01-02', 0); // same-day target: it cannot affect event 2
  const overlap = { ...event(3, '2026-01-01', 0), completedDate: '2026-01-03' };
  const missingEnd = { ...event(4, '2026-01-01', 0), completedDate: null };
  const baseline = backtestFieldHistory(base, 'standard');
  const withExcluded = backtestFieldHistory([...base, overlap, missingEnd, event(5, '2026-01-01', 0, 'team-standard-3v3')], 'standard');
  assert.equal(withExcluded.expectedFieldMae, baseline.expectedFieldMae);
  assert.equal(withExcluded.historicalMae, baseline.historicalMae);
  const sameDay = backtestFieldHistory([base[0], future], 'standard');
  const both = backtestFieldHistory([...base, future], 'standard');
  assert.ok(Math.abs(both.expectedFieldMae! - (baseline.expectedFieldMae! + sameDay.expectedFieldMae!) / 2) < 1e-10);
  assert.deepEqual(backtestFieldHistory([...base].reverse(), 'standard'), baseline);
});

test('out-of-window evidence is excluded and partial coverage stays explicit', () => {
  const old = event(1, '2025-01-01'), target = event(2, '2026-01-01');
  assert.equal(backtestFieldHistory([old, target], 'standard').evaluated, 0);
  const training = event(3, '2025-12-31');
  training.champions.push({ champion: 'C', weight: 1 });
  const result = backtestFieldHistory([training, target], 'standard');
  assert.equal(result.evaluated, 2);
  assert.ok(Math.abs(result.meanFieldCoverage! - 2 / 3) < 1e-10);
  const unseen = { ...target, battleChart: [{ a: "A", b: "C", aWins: 10, bWins: 0, ties: 0, games: 10 }] };
  const unsupported = backtestFieldHistory([training, unseen], "standard");
  assert.equal(unsupported.evaluated, 0); assert.equal(unsupported.expectedFieldMae, null);
  assert.ok(unsupported.excludedOutcomes >= 20);
});
