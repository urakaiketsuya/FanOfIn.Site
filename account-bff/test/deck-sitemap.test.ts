import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { renderDeckSitemap } from '../api/deck-sitemap.ts';
const slug = 'a'.repeat(32);
test('sitemap uses canonical URLs and rejects invalid, duplicate or excessive source entries', () => {
  assert.ok(renderDeckSitemap([slug]).includes(`<loc>https://fanofin.site/decks/${slug}</loc>`));
  assert.ok(renderDeckSitemap([]).endsWith('</urlset>'));
  for (const value of [null, ['<xml>'], [slug, slug], Array(50001).fill(slug)]) assert.throws(() => renderDeckSitemap(value));
});
test('endpoint rereads signed live source, returns no stale XML on failure, and supports HEAD', async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.ACCOUNT_WORKER_URL, oldSecret = process.env.BFF_SHARED_SECRET;
  process.env.ACCOUNT_WORKER_URL = 'https://worker.test'; process.env.BFF_SHARED_SECRET = 'test';
  let slugs = [slug]; let status = 200;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://worker.test/v1/discover/deck-sitemap');
    assert.equal(init?.cache, 'no-store'); assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('Cookie'), null);
    assert.equal(new Headers(init?.headers).get('X-Fanofin-BFF-Secret'), 'test');
    return Response.json({ slugs }, { status });
  };
  const invoke = async (method = 'GET') => {
    let body: unknown; const headers = new Map();
    const response = { statusCode: 0, setHeader: (k: string, v: string) => headers.set(k, v), end: (v: unknown) => { body = v; } };
    await handler({ method } as never, response as never);
    return { status: response.statusCode, headers, body };
  };
  try {
    const good = await invoke(); assert.equal(good.status, 200); assert.ok(String(good.body).includes(slug));
    assert.equal(good.headers.get('Cache-Control'), 'no-store');
    assert.equal((await invoke('HEAD')).body, undefined);
    slugs = []; assert.ok(!String((await invoke()).body).includes(slug));
    status = 500; assert.equal((await invoke()).status, 503);
    status = 200; slugs = ['invalid']; assert.equal((await invoke()).status, 503);
    assert.equal((await invoke('POST')).status, 405);
    delete process.env.BFF_SHARED_SECRET; assert.equal((await invoke()).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.ACCOUNT_WORKER_URL; else process.env.ACCOUNT_WORKER_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.BFF_SHARED_SECRET; else process.env.BFF_SHARED_SECRET = oldSecret;
  }
});
