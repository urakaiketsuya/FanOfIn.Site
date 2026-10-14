import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import sharp from "sharp";
import type { Card, PublicDeck } from "../../shared/src/index.ts";
import handler from "../api/deck-share.ts";
import { championArtwork, championEdition, renderSpotlight, spotlightHtml, spotlightRevision } from "../lib/deck-spotlight.ts";

import { readBytes } from "../lib/http-response.ts";

const slug = "a".repeat(32);
const deck = { publicSlug: slug, visibility: "public", title: 'Water <Diao> & "Friends"', description: 'My deck <script>alert(1)</script>', owner: { displayName: 'Avery & Co', profileSlug: 'b'.repeat(24) }, championName: 'Diao Chan', format: 'STANDARD', versionNumber: 3, publishedAt: '2026-10-13T12:00:00Z', decklist: { main: [], material: [{ card: 'Diao Chan, Dreaming Wish', quantity: 1 }, { card: 'Diao Chan, Idyll Corsage', quantity: 1, printings: [{ editionUuid: 'chosen', quantity: 1 }] }], sideboard: [] } } as PublicDeck;
const cards = [
  { name: 'Diao Chan, Dreaming Wish', types: ['CHAMPION'], level: 2, editions: [{ uuid: 'low', image: '/cards/images/low.jpg' }] },
  { name: 'Diao Chan, Idyll Corsage', types: ['CHAMPION'], level: 3, editions: [{ uuid: 'default', image: '/cards/images/default.jpg' }, { uuid: 'chosen', image: '/cards/images/chosen.jpg' }] },
  { name: 'Unselected champion', types: ['CHAMPION'], level: 9, editions: [{ image: '/cards/images/other.jpg' }] },
] as Card[];

test('spotlight metadata escapes authored text and omits separate champion, format and version', () => {
  const html = spotlightHtml(deck, 'https://fanofin.site', 'https://accounts.fanofin.site');
  assert.match(html, /Water &lt;Diao&gt; &amp; &quot;Friends&quot;/);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('STANDARD'));
  assert.ok(!html.includes('Version 3'));
  assert.match(html, /twitter:card" content="summary_large_image/);
  assert.match(html, /og:image:width" content="1200/);
  assert.match(html, /og:image:height" content="630/);
  assert.match(html, /href="https:\/\/fanofin.site\/decks\/a{32}"/);
  assert.match(html, /noindex,follow/);
  assert.match(spotlightHtml({ ...deck, description: '' }, 'https://fanofin.site', 'https://accounts.fanofin.site'), /View the published decklist/);
  for (const changed of [{ ...deck, title: 'New title' }, { ...deck, owner: { ...deck.owner, displayName: 'New author' } }, { ...deck, publishedAt: 'new' }, { ...deck, description: 'new description' }]) assert.notEqual(spotlightRevision(deck), spotlightRevision(changed));
});

test('art uses the highest selected champion and its chosen printing, never an arbitrary search hit', () => {
  assert.equal(championEdition(deck, cards), '/cards/images/chosen.jpg');
  assert.equal(championEdition({ ...deck, decklist: { ...deck.decklist, material: [] } }, cards), undefined);
});

test('artwork fetch is bounded, fails safely and rejects catalog image URL injection', async () => {
  const urls: string[] = [];
  const fetcher = async (input: string | URL | Request) => { urls.push(String(input)); return new Response(JSON.stringify({ data: cards.map(card => ({ ...card, editions: [{ image: 'https://evil.example/image.jpg' }] })) })); };
  assert.equal(await championArtwork(deck, fetcher as typeof fetch), undefined);
  assert.equal(urls.length, 1);
  assert.equal(await championArtwork(deck, (async () => { throw Error('offline'); }) as typeof fetch), undefined);
  await assert.rejects(readBytes(new Response('too big'), 2), /too large/);
  await assert.rejects(readBytes(new Response('x', { headers: { 'Content-Length': '100' } }), 2), /too large/);
});

test('PNG rendering fits long Unicode titles and authors, with art and corrupt-art fallback', async () => {
  const art = await sharp({ create: { width: 500, height: 700, channels: 3, background: '#89b4fa' } }).jpeg().toBuffer();
  const long = { ...deck, title: 'Very long title <>& '.repeat(10) + '水', owner: { ...deck.owner, displayName: 'Avery '.repeat(20) } };
  for (const artwork of [art, Buffer.from('not an image'), undefined]) {
    const image = await renderSpotlight(long, artwork);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width, 1200); assert.equal(metadata.height, 630); assert.equal(metadata.format, 'png');
    assert.ok(image.length < 2_000_000);
  }
});

test('public gateway serves crawlers without cookies, signs reads, and rechecks withdrawn image URLs', async () => {
  const saved = { worker: process.env.ACCOUNT_WORKER_URL, secret: process.env.BFF_SHARED_SECRET };
  process.env.ACCOUNT_WORKER_URL = 'https://worker.example'; process.env.BFF_SHARED_SECRET = 'test-secret';
  const originalFetch = globalThis.fetch;
  let visibility = 'public'; let status = 200; let calls = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (!String(input).startsWith('https://worker.example')) throw Error('Artwork intentionally unavailable');
    calls++;
    assert.equal(String(input), `https://worker.example/v1/decklists/${slug}`);
    assert.equal(init?.method, 'GET');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Cookie'), null);
    const canonical = `GET\n/v1/decklists/${slug}\n${createHash('sha256').update('').digest('hex')}\n${headers.get('X-Fanofin-BFF-Timestamp')}\n${headers.get('X-Fanofin-BFF-Request-ID')}`;
    assert.equal(headers.get('X-Fanofin-BFF-Signature'), createHmac('sha256', 'test-secret').update(canonical).digest('hex'));
    return new Response(JSON.stringify({ deck: { ...deck, visibility } }), { status });
  }) as typeof fetch;
  const server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (visibility of ['public', 'unlisted']) {
      const response = await originalFetch(`${base}/share/decks/${slug}`, { headers: { Cookie: 'session=private', 'User-Agent': 'Twitterbot' } });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('Content-Type')!, /text\/html/);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      const html = await response.text();
      assert.match(html, /og:image/); assert.ok(!html.includes('test-secret'));
    }
    const png = await originalFetch(`${base}/api/deck-share?slug=${slug}&image=1`);
    assert.equal(png.status, 200); assert.equal(png.headers.get('Content-Type'), 'image/png');
    visibility = 'private';
    assert.equal((await originalFetch(`${base}/share/decks/${slug}/image.png?v=old`)).status, 404);
    visibility = 'public'; status = 404;
    assert.equal((await originalFetch(`${base}/share/decks/${slug}`)).status, 404);
    status = 503;
    assert.equal((await originalFetch(`${base}/share/decks/${slug}`)).status, 502);
    const before = calls;
    assert.equal((await originalFetch(`${base}/share/decks/invalid`)).status, 404);
    assert.equal((await originalFetch(`${base}/share/decks/${slug}`, { method: 'POST' })).status, 405);
    assert.equal(calls, before);
    status = 200;
    const head = await originalFetch(`${base}/share/decks/${slug}`, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [['ACCOUNT_WORKER_URL', saved.worker], ['BFF_SHARED_SECRET', saved.secret]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
