import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeFieldHistory } from './fieldHistory.js';
import type { AnalysisContext } from './context.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { DeckSignature } from './decklists.js';

const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: () => new Map([
  [1, { championName: 'A' } as DeckSignature], [2, { championName: 'B' } as DeckSignature],
]) };
const pair = (id: number, a: string, b: string) => ({ id, status: 'complete', pairing: [{ id: 1, status: a }, { id: 2, status: b }] });
const bundle = { id: 1, event: { date: '2026-01-01T23:00:00Z', dateCompleted: '2026-01-02T02:00:00Z', status: 'complete', format: 'standard' }, decklists: [],
  pairingsByRound: [{ pairings: [pair(1, 'winner', 'loser'), pair(2, 'tied', 'tied'), pair(3, 'loser', 'loser'), pair(4, 'waiting', 'waiting'),
    { ...pair(5, 'winner', 'loser'), status: 'waiting' }, { ...pair(6, 'byed', 'byed'), pairing: [{ id: 1, status: 'byed' }] }, pair(1, 'winner', 'loser')] }],
} as unknown as OmnidexEventBundle;

test('projection excludes byes and ambiguous outcomes, deduplicates, and preserves date and format', () => {
  const result = computeFieldHistory([bundle, bundle], ctx);
  assert.equal(result.events.length, 1);
  const event = result.events[0];
  assert.equal(event.completedDate, '2026-01-02'); assert.equal(event.format, 'standard');
  assert.deepEqual(event.battleChart, [{ a: 'A', b: 'B', aWins: 1, bWins: 0, ties: 1, games: 2 }]);
  assert.equal(event.champions.length, 2);
});

test('incomplete events and invalid dates are excluded; invalid completion cannot enter training', () => {
  assert.equal(computeFieldHistory([{ ...bundle, event: { ...bundle.event, status: 'pending' } }], ctx).events.length, 0);
  assert.equal(computeFieldHistory([{ ...bundle, event: { ...bundle.event, date: 'invalid' } }], ctx).events.length, 0);
  assert.equal(computeFieldHistory([{ ...bundle, event: { ...bundle.event, dateCompleted: '2025-01-01' } }], ctx).events[0].completedDate, null);
});
