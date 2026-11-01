import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifestLoader } from '../src/lib/sync/publishedManifest';
test('a long-lived tab discovers uploads; forced checks bypass the fresh manifest', async () => {
  let time = 0, generation = 'old', calls = 0;
  const load = createManifestLoader((async (_url, options) => {
    calls++; assert.equal(options?.cache, 'no-cache');
    return Response.json({ 'broadcast-timelines': generation });
  }) as typeof fetch, () => time);
  assert.equal((await load())['broadcast-timelines'], 'old');
  generation = 'new';
  assert.equal((await load())['broadcast-timelines'], 'old');
  time = 60_000;
  assert.equal((await load())['broadcast-timelines'], 'new');
  generation = 'newer';
  assert.equal((await load(true))['broadcast-timelines'], 'newer');
  assert.equal(calls, 3);
});
test('concurrent timeline consumers share one check and failed checks can retry', async () => {
  let calls = 0;
  const load = createManifestLoader((async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return Response.json({ 'broadcast-timelines': 'new' });
  }) as typeof fetch);
  const first = load(true), second = load(true);
  assert.equal(first, second);
  assert.deepEqual(await first, {});
  assert.equal((await load())['broadcast-timelines'], 'new');
  assert.equal(calls, 2);
});
test('HTTP failures and invalid manifests do not poison later checks', async () => {
  const responses = [new Response('', {status: 503}), Response.json([]), Response.json({foo: 12}), Response.json({foo: 'ready'})];
  const load = createManifestLoader((async () => responses.shift()!) as typeof fetch);
  for (let i = 0; i < 3; i++) assert.deepEqual(await load(), {});
  assert.deepEqual(await load(), {foo: 'ready'});
});

test('visible timelines check on interval, return and reconnect; unmount stops checks', async () => {
  const { watchPublishedUpdates } = await import('../src/lib/sync/watchPublishedUpdates');
  const host = new EventTarget();
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
  let tick: () => void = () => {}, checks = 0, cleared = false;
  const clock = Object.assign(host, {
    setInterval: (callback: () => void, delay: number) => { assert.equal(delay, 60_000); tick = callback; return 1; },
    clearInterval: (id: number) => { assert.equal(id, 1); cleared = true; tick = () => {}; },
  });
  const stop = watchPublishedUpdates(() => checks++, clock as unknown as Window, page);
  tick(); host.dispatchEvent(new Event('focus')); host.dispatchEvent(new Event('online'));
  assert.equal(checks, 3);
  page.visibilityState = 'hidden';
  tick(); host.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(checks, 3);
  page.visibilityState = 'visible'; page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(checks, 4);
  stop(); tick(); host.dispatchEvent(new Event('focus')); host.dispatchEvent(new Event('online')); page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(checks, 4); assert.equal(cleared, true);
});
