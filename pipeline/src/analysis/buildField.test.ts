import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreExpectedField } from '@gatcg/shared';
import { computeBuildField, UNASSIGNED_BUILD } from './buildField.js';
import type { AnalysisContext } from './context.js';
import type { DeckSignature } from './decklists.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: () => new Map(
  [1, 2, 3].map(id => [id, { championName: 'Same Champion' } as DeckSignature])) };
const pair = (id: number, opponent = 2, a = 'winner', b = 'loser') =>
  ({ id, status: 'complete', pairing: [{ id: 1, status: a }, { id: opponent, status: b }] });
const bundle = (id: number) => ({ id, event: { status: 'complete', format: 'standard' }, decklists: [],
  pairingsByRound: [{ pairings: [pair(1), pair(1), pair(2, 2, 'tied', 'tied'), pair(3, 3),
    pair(4, 2, 'loser', 'loser'), pair(5, 1), { ...pair(6), status: 'waiting' },
    { ...pair(7), pairing: [{ id: 1, status: 'byed' }] }] }] } as unknown as OmnidexEventBundle);
const builds = [{ id: 'a', deckIds: ['1:1', '2:1'] }, { id: 'b', deckIds: ['1:2', '2:2'] }];

test('same-Champion builds remain distinct; pooled outcomes deduplicate and preserve unknown field mass', () => {
  const result = computeBuildField([bundle(1), bundle(1), bundle(2)], ctx, builds, 4);
  assert.equal(result.events, 2);
  assert.equal(result.validPairings, 6); assert.equal(result.assignedPairings, 4);
  assert.deepEqual(result.battleChart, [{ a: 'a', b: 'b', aWins: 2, bWins: 0, ties: 2, games: 4 }]);
  const score = scoreExpectedField(['a'], result.field, result.battleChart)[0];
  assert.ok(Math.abs(score.coverage - 2 / 3) < 1e-12);
  assert.deepEqual(score.missing, [UNASSIGNED_BUILD]);
  assert.ok(Math.abs(score.lower - (0.5 + 8 / 14) / 3) < 1e-12);
  assert.equal(computeBuildField([bundle(1)], ctx, builds, 4).battleChart.length, 0);
});

test('rejects ambiguous membership and mixed formats, excludes incomplete events', () => {
  assert.throws(() => computeBuildField([], ctx, [...builds, { id: 'c', deckIds: ['1:1'] }]), /Overlapping/);
  assert.throws(() => computeBuildField([], ctx, [...builds, builds[0]]), /Duplicate/);
  assert.throws(() => computeBuildField([bundle(1), { ...bundle(2), event: { ...bundle(2).event, format: 'other' } }], ctx, builds), /one format/);
  assert.equal(computeBuildField([{ ...bundle(1), event: { ...bundle(1).event, status: 'pending' } }], ctx, builds).events, 0);
});

test('canonical pair orientation preserves wins for the actual build', () => {
  const reversed = [{ id: 'z', deckIds: ['1:1'] }, { id: 'a', deckIds: ['1:2'] }];
  const result = computeBuildField([bundle(1)], ctx, reversed, 1);
  assert.deepEqual(result.battleChart, [{ a: 'a', b: 'z', aWins: 0, bWins: 1, ties: 1, games: 2 }]);
  const scores = scoreExpectedField(['a', 'z'], [{ champion: 'a', weight: 1 }, { champion: 'z', weight: 1 }], result.battleChart);
  assert.equal(scores[0].champion, 'z');
  assert.ok(Math.abs(scores[0].lower + scores[1].lower - 1) < 1e-12);
});
