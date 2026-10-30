import assert from 'node:assert/strict';
import test from 'node:test';
import { createSightingEventLoader } from '../src/features/topdecks/sightingEventLoader';

function fixture() {
  const requests: { url: string; resolve: (response: Response) => void; reject: (error: Error) => void }[] = [];
  const loader = createSightingEventLoader(((url: string) => new Promise<Response>((resolve, reject) => {
    requests.push({ url, resolve, reject });
  })) as typeof fetch);
  return { loader, requests };
}
const bundle = { event: { format: 'standard' }, decklists: [] };
const ok = () => Response.json(bundle);

test('consumers share in-flight and resolved event bundles', async () => {
  const { loader, requests } = fixture();
  const first = loader.load(10);
  assert.equal(loader.load(10), first);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/data/omnidex/events/10.json');
  requests[0].resolve(ok());
  assert.deepEqual(await first, bundle);
  assert.equal(loader.load(10), first);
});

for (const failure of ['network', 'http', 'json'] as const) {
  test(`${failure} failure is evicted and the next load succeeds`, async () => {
    const { loader, requests } = fixture();
    const first = loader.load(10);
    const rejected = assert.rejects(first);
    if (failure === 'network') requests[0].reject(new Error('Offline'));
    else requests[0].resolve(failure === 'http' ? new Response(null, { status: 503 }) : new Response('invalid json'));
    await rejected;
    const retry = loader.load(10);
    assert.notEqual(retry, first);
    requests[1].resolve(ok());
    assert.deepEqual(await retry, bundle);
  });
}

test('an older failed load cannot evict a pending or successful retry', async () => {
  for (const retryAlreadyComplete of [false, true]) {
    const { loader, requests } = fixture();
    const old = loader.load(10);
    const rejected = assert.rejects(old);
    loader.invalidate(10);
    const retry = loader.load(10);
    if (retryAlreadyComplete) { requests[1].resolve(ok()); await retry; }
    requests[0].reject(new Error('Late failure'));
    await rejected;
    assert.equal(loader.load(10), retry);
    assert.equal(requests.length, 2);
    if (!retryAlreadyComplete) requests[1].resolve(ok());
    assert.deepEqual(await retry, bundle);
  }
});

test('explicit retry refreshes a published error without disturbing other events', async () => {
  const { loader, requests } = fixture();
  const failedBundle = loader.load(10); const other = loader.load(11);
  requests[0].resolve(Response.json({ decklists: { error: 'Unavailable' } }));
  await failedBundle;
  loader.invalidate(10);
  const retry = loader.load(10);
  assert.notEqual(retry, failedBundle);
  assert.equal(loader.load(11), other);
  requests[1].resolve(ok()); requests[2].resolve(ok());
  await Promise.all([other, retry]);
});

test('cache retains at most twelve event requests and evicted consumers still finish', async () => {
  const { loader, requests } = fixture();
  const pending = Array.from({ length: 13 }, (_, id) => loader.load(id));
  assert.equal(loader.load(1), pending[1]);
  const reloaded = loader.load(0);
  assert.notEqual(reloaded, pending[0]);
  assert.equal(requests.length, 14);
  requests.forEach(request => request.resolve(ok()));
  for (const result of await Promise.all([...pending, reloaded])) assert.deepEqual(result, bundle);
});
