import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditFieldRanges, auditFieldWindows, classifyFieldRange, laterFieldBounds, type FieldEvent } from '@gatcg/shared';
const event = (id: number, date: string, wins = 8): FieldEvent => ({ id, date, completedDate: date, format: 'standard', champions: [{ champion: 'A', weight: 1 }, { champion: 'B', weight: 1 }], battleChart: [{ a: 'A', b: 'B', aWins: wins, bWins: 10 - wins, ties: 0, games: 10 }] });
test('later scores use fixed training weights, raw scores and explicit unknown bounds', () => {
  const row = laterFieldBounds('A', [{ champion: 'A', weight: 1 }, { champion: 'B', weight: 2 }, { champion: 'C', weight: 1 }], event(1, '2026-01-01'))!;
  assert.equal(row.lower, 0.525); assert.equal(row.upper, 0.775); assert.equal(row.coverage, 0.75);
  assert.equal(laterFieldBounds('A', [{ champion: 'B', weight: 0 }], event(1, '2026-01-01')), null);
});
test('classification distinguishes containment, disjointness and partial evidence', () => {
  const p = { lower: 0.4, upper: 0.6 };
  assert.equal(classifyFieldRange(p, { lower: 0.5, upper: 0.6 }), 'inside');
  assert.equal(classifyFieldRange(p, { lower: 0.7, upper: 1 }), 'outside');
  assert.equal(classifyFieldRange(p, { lower: 0, upper: 0.2 }), 'outside');
  assert.equal(classifyFieldRange(p, { lower: 0, upper: 1 }), 'inconclusive');
  assert.equal(classifyFieldRange(p, { lower: 0.6, upper: 0.8 }), 'inconclusive');
});
test('audit excludes same-day, unfinished, overlapping, old and other-format training', () => {
  const prior = Array.from({ length: 5 }, (_, i) => event(i, `2026-01-0${i+1}`));
  const target = event(10, '2026-02-01', 0);
  const baseline = auditFieldRanges([...prior, target], 'standard', 5, 1);
  assert.equal(baseline.evaluated, 2); assert.equal(baseline.outside, 2);
  const excluded = [event(7, '2025-01-01', 0), { ...event(8, '2026-01-08', 0), completedDate: null }, { ...event(9, '2026-01-09', 0), completedDate: '2026-02-02' }, event(6, '2026-02-01', 0), { ...event(11, '2026-01-11', 0), format: 'other' }];
  assert.deepEqual(auditFieldRanges([...excluded, target, ...prior].reverse(), 'standard', 5, 1), baseline);
});
test('sparse history skips instead of inventing intervals; invalid limits and duplicate events fail', () => {
  const events = [event(1, '2026-01-01'), event(2, '2026-02-01')];
  const row = auditFieldRanges(events, 'standard', 5, 1);
  assert.equal(row.evaluated, 0); assert.equal(row.skipped, 2); assert.equal(row.meanRangeWidth, null);
  assert.throws(() => auditFieldRanges(events, 'standard', 5, 0));
  assert.throws(() => auditFieldRanges([...events, events[0]], 'standard'));
});

test('window audit pools later matches while freezing training weights and clusters', () => {
  const prior = Array.from({ length: 5 }, (_, i) => event(i, `2026-01-0${i+1}`));
  const targets = [event(10, '2026-02-01', 10), event(11, '2026-02-28', 0)];
  targets[1].champions = [{ champion: 'B', weight: 999 }];
  const result = auditFieldWindows([...prior, ...targets], 'standard', '2026-02-01', '2026-03-28');
  assert.deepEqual(result.windows.map(w => w.eventIds), [[10, 11], []]);
  assert.equal(result.windows[0].details[0].laterLower, 0.5);
  assert.equal(result.windows[0].details[0].laterGames, 20);
  assert.equal(result.windows[0].details[0].predictedLower, 0.625);
  assert.equal(result.windows[0].outside, 2);
  assert.equal(result.windows[1].evaluated, 0);
  const future = auditFieldWindows([...prior, ...targets, event(99, '2026-03-01', 0)], 'standard', '2026-02-01', '2026-03-28');
  assert.deepEqual(future.windows[0], result.windows[0]);
  const excluded = [{ ...event(12, '2026-02-05'), completedDate: null }, { ...event(13, '2026-02-06'), completedDate: '2026-03-01' }, { ...event(14, '2026-01-20', 0), completedDate: '2026-02-02' }];
  const extended = auditFieldWindows([...targets, ...excluded, ...prior].reverse(), 'standard', '2026-02-01', '2026-02-28');
  assert.deepEqual(extended.windows[0].details, result.windows[0].details);
  assert.equal(extended.windows[0].excludedEvents, 2);
});
test('window boundaries omit partial windows and reject invalid dates, sizes and duplicates', () => {
  assert.equal(auditFieldWindows([], 'standard', '2026-02-01', '2026-02-27').windows.length, 0);
  assert.throws(() => auditFieldWindows([], 'standard', '2026-02-30', '2026-03-31'));
  assert.throws(() => auditFieldWindows([], 'standard', '2026-03-01', '2026-02-01'));
  assert.throws(() => auditFieldWindows([], 'standard', '2026-02-01', '2026-03-01', 5, 0));
  const e = event(1, '2026-01-01');
  assert.throws(() => auditFieldWindows([e, e], 'standard', '2026-02-01', '2026-03-01'));
});
