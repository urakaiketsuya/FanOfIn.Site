import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyMatchupScope, observedMatchupCohort, type ArchetypeTaxonomyData } from '@gatcg/shared';
import { computeObservedMatchups } from './observedMatchups.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
const taxonomy = { clusters: [
  { id: 'a', name: 'A', championName: 'Silvie', deckIds: ['1:1', '1:3', '2:1', '3:1'] },
  { id: 'b', name: 'B', championName: 'Tristan', deckIds: ['1:2', '2:2', '3:2'] },
] } as ArchetypeTaxonomyData;
const pair = (id: number, a: number, b: number, statusA = 'winner', statusB = 'loser', status = 'complete') => ({ id, status, pairing: [{ id: a, status: statusA }, { id: b, status: statusB }] });
const bundle = (id: number, date: string, pairings: unknown[], extra = {}) => ({ id, event: { name: `Event ${id}`, date, status: 'complete', format: 'standard', ...extra }, teams: { error: 'Not a team event.' }, pairingsByRound: [{ stage: 1, round: 1, pairings }] }) as OmnidexEventBundle;
const events = [
  bundle(1, '2026-01-01', [pair(1, 1, 2), pair(1, 1, 2), pair(2, 1, 3), pair(3, 1, 2, 'tied', 'tied'), pair(4, 1, 2, 'pending', 'pending', 'pending'), pair(5, 1, 99), pair(6, 1, 2, 'winner', 'winner')]),
  bundle(2, '2026-02-01', [pair(1, 1, 2, 'loser', 'winner')]),
  bundle(3, '2026-03-01', [pair(1, 1, 2)], { format: 'team-standard' }),
];
test('publishes only completed unambiguous individual pairings, deduplicated by round/table and event', () => {
  const data = computeObservedMatchups([...events, events[0]], taxonomy, '2026-04-01');
  assert.equal(data.events.length, 2);
  assert.deepEqual(data.events[1].rows, [['a', 'a', 1, 0, 0], ['a', 'b', 1, 0, 1]]);
  assert.deepEqual(data.events[1].decks, { a: 2, b: 1 });
  const all = observedMatchupCohort(data, 'a', emptyMatchupScope);
  assert.equal(all.results, 5); assert.equal(all.decks, 3); assert.equal(all.events, 2); assert.equal(all.winRate, .5);
  assert.deepEqual(all.matchups, [{ id: 'b', matches: 3, winRate: .5, eventRange: { low: 0, high: .75, events: 2 } }, { id: 'a', matches: 1, winRate: .5, eventRange: { low: .5, high: .5, events: 1 } }]);
});
test('inclusive date, event, and format filters use the same cohort for rates and sample sizes', () => {
  const data = computeObservedMatchups(events, taxonomy, '2026-04-01');
  const scope = { ...emptyMatchupScope, from: '2026-02-01', to: '2026-02-01' };
  const filtered = observedMatchupCohort(data, 'a', scope);
  assert.equal(filtered.results, 1); assert.equal(filtered.winRate, 0); assert.equal(filtered.decks, 1);
  assert.equal(observedMatchupCohort(data, 'b', scope).winRate, 1);
  assert.deepEqual(filtered, observedMatchupCohort(data, 'a', { ...emptyMatchupScope, event: '2' }));
  for (const empty of [{ ...scope, event: '1' }, { ...scope, format: 'PANTHEON' }, { ...scope, from: '2027-01-01' }]) {
    const result = observedMatchupCohort(data, 'a', empty);
    assert.equal(result.winRate, null); assert.equal(result.results, 0); assert.deepEqual(result.matchups, []);
  }
});
test('ambiguous memberships, team data and future events do not enter the cohort', () => {
  const ambiguous = { ...taxonomy, clusters: [...taxonomy.clusters, { ...taxonomy.clusters[1], id: 'c', deckIds: ['1:1'] }] };
  assert.equal(computeObservedMatchups([events[0]], ambiguous, '2026-04-01').events.length, 0);
  assert.equal(computeObservedMatchups([events[1]], taxonomy, '2026-01-01').events.length, 0);
  assert.equal(computeObservedMatchups([{ ...events[1], teams: [{ id: 1 }] } as unknown as OmnidexEventBundle], taxonomy, '2026-04-01').events.length, 0);
});
