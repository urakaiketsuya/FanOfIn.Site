import test from 'node:test';
import assert from 'node:assert/strict';
import type { OmnidexEventBundle } from './cache.js';
import { buildPlayerDirectory } from './playerDirectory.js';
const bundle = (id: number, status: string, players: {id: number; username: string}[], fetchedAt = '2026-01-01') => ({
  id, event: {id, status}, fetchedAt,
  players: players.map(player => ({...player, country: 'US', emblem: null})),
}) as unknown as OmnidexEventBundle;
test('all public event rosters produce browsable identities, including single-player and unfinished events', () => {
  const result = buildPlayerDirectory([
    bundle(1, 'complete', [{id: 1, username: 'Finished'}]),
    bundle(2, 'registration', [{id: 2, username: 'Registered'}]),
    bundle(3, 'in_progress', [{id: 3, username: 'Playing'}]),
    bundle(4, 'canceled', [{id: 4, username: 'Canceled'}]),
    bundle(5, 'complete', []),
  ]);
  assert.deepEqual(result.map(p => [p.id, p.eventIds]), [[1,[1]],[2,[2]],[3,[3]],[4,[4]]]);
  assert.ok(result.every(p => !('rating' in p) && !('wins' in p)));
});
test('latest observed identity wins regardless of event order and event membership stays unique', () => {
  const latest = bundle(2, 'registration', [{id: 1, username: 'New name'}], '2026-03-01');
  const older = bundle(9, 'complete', [{id: 1, username: 'Old name'}], '2026-02-01');
  const expected = [{id:1,username:'New name',country:'US',emblem:null,eventIds:[2,9]}];
  assert.deepEqual(buildPlayerDirectory([latest, older, latest]), expected);
  assert.deepEqual(buildPlayerDirectory([older, latest]), expected);
});
