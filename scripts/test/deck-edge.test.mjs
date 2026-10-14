import assert from 'node:assert/strict';
import test from 'node:test';
import { routeDeckRequest } from '../../deck-edge/index.mjs';
const slug = 'a'.repeat(32);
const url = `https://fanofin.site/decks/${slug}`;
test('tournament routes preserve the original request', async () => {
  const request = new Request('https://fanofin.site/decks/abc123/');
  await routeDeckRequest(request, async input => { assert.equal(input, request); return new Response('static'); });
});
test('community proxy strips credentials and only exposes public successful pages to indexing', async () => {
  for (const indexable of ['1', '0']) {
    const response = await routeDeckRequest(new Request(url, { headers: { Cookie: 'secret' } }), async (input, init) => {
      assert.equal(input, `https://accounts.fanofin.site/render/decks/${slug}`);
      assert.equal(new Headers(init.headers).get('Cookie'), null);
      assert.equal(init.cache, 'no-store');
      assert.equal(init.redirect, 'manual');
      return new Response('html', { headers: { 'X-Deck-Indexable': indexable, 'Set-Cookie': 'bad', 'Content-Type': 'text/html' } });
    });
    assert.equal(response.headers.get('X-Robots-Tag'), indexable === '1' ? null : 'noindex');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});
test('withdrawal, failures, HEAD, slash redirects and methods', async () => {
  for (const status of [404, 500, 302]) {
    const response = await routeDeckRequest(new Request(url), async () => new Response('upstream', { status }));
    assert.equal(response.status, status === 404 ? 404 : 503);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  }
  assert.equal((await routeDeckRequest(new Request(url), async () => { throw Error(); })).status, 503);
  assert.equal(await (await routeDeckRequest(new Request(url, { method: 'HEAD' }), async () => new Response('body'))).text(), '');
  const noFetch = async () => { assert.fail('unexpected fetch'); };
  assert.equal((await routeDeckRequest(new Request(url + '/'), noFetch)).status, 308);
  assert.equal((await routeDeckRequest(new Request(url, { method: 'POST' }), noFetch)).status, 405);
});
test('preview hosts remain noindex even for public decks', async () => {
  const response = await routeDeckRequest(new Request(`https://preview.workers.dev/decks/${slug}`), async () => new Response('html', { headers: { 'X-Deck-Indexable': '1' } }));
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
});
test('community sitemap uses fixed live endpoint and never forwards query or cookies', async () => {
  const response = await routeDeckRequest(new Request('https://fanofin.site/decks/sitemap.xml?target=evil', { headers: { Cookie: 'secret' } }), async (input, init) => {
    assert.equal(input, 'https://accounts.fanofin.site/render/deck-sitemap.xml');
    assert.equal(new Headers(init.headers).get('Cookie'), null);
    return new Response('<urlset/>', { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Type'), 'application/xml; charset=utf-8');
  assert.equal(await response.text(), '<urlset/>');
});
