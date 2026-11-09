import test from 'node:test';
import assert from 'node:assert/strict';
import type { OmnidexPlayerSummary, PlayerRating } from '@gatcg/shared';
import { playerDirectoryRows } from '../src/features/players/playerDirectory';
const players = [{ id: 31533, username: 'New player', eventIds: [] }, { id: 1, username: 'Veteran', eventIds: [1] }, { id: 2, username: 'Another player', eventIds: [2] }] as OmnidexPlayerSummary[];
test('includes players with no event history or matches without assigning invented ratings', () => {
  const rows = playerDirectoryRows(players, [{ playerId: 1, matches: 5, rating: 1500 }, { playerId: 2, matches: 0, rating: 1500 }] as PlayerRating[]);
  assert.deepEqual(rows.map(row => [row.player.id, row.rank, row.rating?.rating]), [[1, 1, 1500], [2, null, undefined], [31533, null, undefined]]);
});
test('directory remains searchable when ratings have not loaded', () => {
  assert.equal(playerDirectoryRows(players, []).length, 3);
  assert.ok(playerDirectoryRows(players, []).every(row => row.rank === null && !row.rating));
});
