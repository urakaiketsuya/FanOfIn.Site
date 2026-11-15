import test from 'node:test';
import assert from 'node:assert/strict';
import type { OmnidexEvent } from '@gatcg/shared';
import { findMaxEventId } from './bounds.js';

function eventsThrough(max: number, missing: (id: number) => boolean = () => false) {
  return async (id: number) => id <= max && !missing(id) ? { id } as OmnidexEvent : null;
}

test('frontier discovery crosses the missing midpoint that hid event 68510', async () => {
  assert.equal(await findMaxEventId(67582, eventsThrough(68510, id => id >= 67583 && id < 67700), 0), 68510);
  assert.equal(await findMaxEventId(0, eventsThrough(68510, id => id >= 67583 && id < 67700), 0), 68510);
});
test('frontier discovery crosses deleted ranges and missing exponential probes', async () => {
  assert.equal(await findMaxEventId(0, eventsThrough(300, id => id >= 128 && id <= 148), 0), 300);
});
test('empty upstream and deleted known frontier preserve safe bounds', async () => {
  assert.equal(await findMaxEventId(0, eventsThrough(0), 0), 0);
  assert.equal(await findMaxEventId(300, eventsThrough(250), 0), 300);
});
test('upstream errors abort discovery instead of treating them as missing IDs', async () => {
  await assert.rejects(findMaxEventId(0, async () => { throw new Error('503'); }, 0), /503/);
});
