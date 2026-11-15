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

test('public metadata fills player/champion identities without publishing private decks or field statistics', async () => {
  const bundle = JSON.parse(await readFile(new URL('../../../data/omnidex/events/68510.json', import.meta.url), 'utf8')) as OmnidexEventBundle;
  const { index, players } = await buildOmnidexIndex([bundle], []);
  assert.equal(bundle.decklists instanceof Array && bundle.decklists.length, 0);
  assert.equal(index.events[0]?.publicDecklistCount, 0);
  assert.equal(index.events[0]?.fieldComposition, undefined);
  assert.ok(index.events[0]?.championNames?.includes('Kongming'));
  assert.deepEqual(players.find(player => player.id === 31533)?.championEvents, [{ eventId: 68510, championName: 'Kongming' }]);
});
