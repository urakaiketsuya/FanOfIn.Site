import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonMaybe } from './http.js';

test('optional event resources retry transient network and server failures', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (calls === 1) throw new TypeError('connection reset');
    if (calls === 2) return new Response(JSON.stringify({error:'Unavailable'}), {status:503});
    return Response.json({standings:[]});
  });
  assert.deepEqual(await fetchJsonMaybe('https://example.test/event/standings'), {standings:[]});
  assert.equal(calls,3);
});
test('expected unavailable event resources remain explicit without retry', async t => {
  let calls=0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({error:'Round not found'}, {status:404}); });
  assert.deepEqual(await fetchJsonMaybe('https://example.test/event/pairings'), {error:'Round not found'});
  assert.equal(calls,1);
});
test('exhausted optional resource retries fail with the source URL rather than inventing empty data', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('connection reset'); });
  await assert.rejects(fetchJsonMaybe('https://example.test/event/players',1), /event\/players.*1 attempts/);
});
