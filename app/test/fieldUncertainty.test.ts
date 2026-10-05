import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resampleExpectedField, type FieldEvent } from '@gatcg/shared';
const event = (id: number, wins = 8): FieldEvent => ({ id, date: '2026-01-01', completedDate: '2026-01-02', format: 'standard', champions: [{ champion: 'A', weight: 1 }], battleChart: [{ a: 'A', b: 'B', aWins: wins, bWins: 10 - wins, ties: 0, games: 10 }] });
const field = [{ champion: 'B', weight: 1 }];

test('identical event clusters have an exact fixed score and deterministic ordering', () => {
  const events = Array.from({ length: 5 }, (_, i) => event(i));
  const result = resampleExpectedField(['A'], field, events)[0];
  assert.equal(result.evidenceEvents, 5);
  assert.equal(result.lower, 45 / 60);
  assert.equal(result.upper, 45 / 60);
  assert.deepEqual(resampleExpectedField(['A'], field, events.toReversed()), [result]);
});
test('event variation widens bounds and missing opponents remain unknown', () => {
  const events = Array.from({ length: 10 }, (_, i) => event(i, i < 5 ? 0 : 10));
  const original = JSON.stringify(events);
  const row = resampleExpectedField(['A'], field, events)[0];
  assert.ok(row.lower! < 0.5 && row.upper! > 0.5);
  const missing = resampleExpectedField(['A'], [...field, { champion: 'C', weight: 1 }], events)[0];
  assert.equal(missing.lower, row.lower! / 2);
  assert.ok(Math.abs(missing.upper! - (row.upper! / 2 + 0.5)) < 1e-12);
  assert.equal(JSON.stringify(events), original);
});
test('too little evidence, mirrors, excluded opponents and invalid populations do not invent precision', () => {
  const events = Array.from({ length: 4 }, (_, i) => event(i));
  assert.equal(resampleExpectedField(['A'], field, events)[0].lower, null);
  assert.equal(resampleExpectedField(['A'], [{ champion: 'A', weight: 1 }], [...events, event(5)])[0].evidenceEvents, 0);
  assert.deepEqual(resampleExpectedField(['A'], [{ champion: 'B', weight: -1 }], events), []);
  assert.deepEqual(resampleExpectedField(['A'], field, [...events, event(0)]), []);
  assert.deepEqual(resampleExpectedField(['A'], field, [...events, { ...event(5), format: 'other' }]), []);
  assert.equal(resampleExpectedField(['A'], field, [])[0].lower, null);
});

test('replicates below the matchup threshold keep full unknown bounds', () => {
  const events = Array.from({ length: 5 }, (_, i) => event(i));
  const row = resampleExpectedField(['A'], field, events, 51)[0];
  assert.equal(row.lower, 0);
  assert.equal(row.upper, 1);
  assert.equal(row.evidenceEvents, 5);
});
