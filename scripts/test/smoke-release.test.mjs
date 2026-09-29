import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smokeRelease } from '../smoke-release.mjs';

const revision = 'a'.repeat(40);
const timestamp = '2026-09-29T12:00:00.000Z';
function fixture() {
  const responses = new Map([
    ['/', { body: '<div id="root"></div><script src="/assets/app.js"></script>', type: 'text/html' }],
    ['/assets/app.js', { body: 'console.log("loaded")', type: 'text/javascript' }],
    ['/release.json', { body: { revision, dirty: false, builtAt: timestamp } }],
    ['/data/manifest.json', { body: {} }],
    ['/api/health', { body: { success: true, schema: { ready: true } } }],
  ]);
  for (const name of ['archetype-taxonomy', 'reference-archetypes', 'curated-strategies']) {
    responses.get('/data/manifest.json').body[`analysis-${name}`] = timestamp;
    responses.set(`/data/analysis/${name}.json`, { body: { generatedAt: timestamp } });
  }
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/api/health') {
      assert.equal(parsed.origin, 'https://accounts.fanofin.site');
      assert.equal(options.headers.Origin, 'https://fanofin.site');
    }
    const value = responses.get(parsed.pathname);
    assert.ok(value, `Unexpected request: ${url}`);
    return new Response(typeof value.body === 'string' ? value.body : JSON.stringify(value.body), {
      status: value.status ?? 200, headers: { 'Content-Type': value.type ?? 'application/json' },
    });
  };
  return { responses, run: () => smokeRelease({ origin: 'http://localhost:4173', expectedRevision: revision, fetchImpl }) };
}

test('accepts a clean matching release and ready public account service', async () => {
  assert.equal(await fixture().run(), revision);
});
for (const [name, mutate, error] of [
  ['dirty build', r => { r.get('/release.json').body.dirty = true; }, /uncommitted/],
  ['wrong revision', r => { r.get('/release.json').body.revision = 'b'.repeat(40); }, /differs/],
  ['missing build timestamp', r => { delete r.get('/release.json').body.builtAt; }, /build timestamp/],
  ['missing artifact and manifest timestamps', r => {
    delete r.get('/data/analysis/archetype-taxonomy.json').body.generatedAt;
    delete r.get('/data/manifest.json').body['analysis-archetype-taxonomy'];
  }, /artifact timestamp/],
  ['stale manifest', r => { r.get('/data/manifest.json').body['analysis-archetype-taxonomy'] = 'old'; }, /Stale manifest/],
  ['SPA fallback instead of JavaScript', r => { r.get('/assets/app.js').type = 'text/html'; }, /did not return JavaScript/],
  ['failed asset request', r => { r.get('/assets/app.js').status = 404; }, /HTTP 404/],
  ['unready account schema', r => { r.get('/api/health').body.schema.ready = false; }, /schema not ready/],
  ['failed account health', r => { r.get('/api/health').status = 503; }, /HTTP 503/],
]) {
  test(`rejects ${name}`, async () => {
    const { responses, run } = fixture();
    mutate(responses);
    await assert.rejects(run, error);
  });
}
