import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPopularityLoader, popularityKey } from '../src/features/popular/popularityWorkerClient';
import type { PopularityInput, PopularityResponse } from '../src/features/popular/popularityWorkerProtocol';
import type { PopularDeck } from '../src/features/popular/popularityAggregation';

const input: PopularityInput = { cardIndex: { generatedAt: '1', cardNames: [], decks: [] },
  sightings: { generatedAt: '1', entries: [] }, catalog: [] };
function harness() {
  const workers: Worker[] = [];
  const terminated: boolean[] = [];
  const load = createPopularityLoader(() => {
    const i = workers.length;
    const worker = { onmessage: null, onerror: null, onmessageerror: null,
      postMessage: () => {}, terminate: () => { terminated[i] = true; } } as unknown as Worker;
    workers.push(worker);
    return worker;
  });
  const reply = (i: number, data: PopularityResponse) => workers[i].onmessage!({ data } as MessageEvent);
  return { load, workers, terminated, reply };
}
test('concurrent callers and remounts share work and results', async () => {
  const h = harness();
  const first = h.load(input);
  assert.strictEqual(h.load(structuredClone(input)), first);
  assert.equal(h.workers.length, 1);
  const decks = [] as PopularDeck[];
  h.reply(0, { decks });
  assert.strictEqual(await first, decks);
  assert.strictEqual(await h.load(structuredClone(input)), decks);
  assert.equal(h.workers.length, 1);
  assert.equal(h.terminated[0], true);
});
test('older completions cannot replace the newest cached dataset', async () => {
  const h = harness();
  const old = h.load(input);
  const nextInput = { ...input, sightings: { ...input.sightings, generatedAt: '2' } };
  const next = h.load(nextInput);
  const decks = [] as PopularDeck[];
  h.reply(1, { decks });
  await next;
  h.reply(0, { decks: [] });
  await old;
  assert.strictEqual(await h.load(nextInput), decks);
  assert.equal(h.workers.length, 2);
});
test('worker failures release resources and allow retry', async () => {
  for (const failure of ['error', 'messageerror', 'response']) {
    const h = harness();
    const failed = h.load(input);
    if (failure === 'response') h.reply(0, { error: 'Failed' });
    else if (failure === 'error') h.workers[0].onerror!({} as ErrorEvent);
    else h.workers[0].onmessageerror!({} as MessageEvent);
    await assert.rejects(failed);
    assert.equal(h.terminated[0], true);
    const retry = h.load(input);
    h.reply(1, { decks: [] });
    assert.deepEqual(await retry, []);
  }
});
test('worker startup failure can be retried', async () => {
  let calls = 0;
  const load = createPopularityLoader(() => { calls++; throw new Error('Unavailable'); });
  await assert.rejects(load(input));
  await assert.rejects(load(input));
  assert.equal(calls, 2);
});
test('cache identity tracks both generations and catalog classifications', () => {
  const key = popularityKey(input);
  assert.equal(popularityKey(structuredClone(input)), key);
  assert.notEqual(popularityKey({ ...input, cardIndex: { ...input.cardIndex, generatedAt: '2' } }), key);
  assert.notEqual(popularityKey({ ...input, sightings: { ...input.sightings, generatedAt: '2' } }), key);
  assert.notEqual(popularityKey({ ...input, catalog: [{ name: 'Card', classes: ['MAGE'], elements: ['FIRE'] }] as PopularityInput['catalog'] }), key);
});
