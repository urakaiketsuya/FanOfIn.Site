import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildOmnidexIndex } from './build.js';
import type { OmnidexEventBundle } from './cache.js';

test('reported five-player event publishes Inari in both event search and the player directory', async () => {
  const bundle = JSON.parse(await readFile(new URL('../../../data/omnidex/events/68510.json', import.meta.url), 'utf8')) as OmnidexEventBundle;
  const { index, players } = await buildOmnidexIndex([bundle], []);
  const event = index.events.find(event => event.id === 68510);
  assert.equal(event?.playerCount, 5);
  assert.ok(event?.participantNames?.includes('Inari'));
  assert.deepEqual(players.find(player => player.id === 31533)?.eventIds, [68510]);
  assert.equal(players.find(player => player.id === 31533)?.username, 'Inari');
});
