import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderCommunityDeckPage } from '../lib/deck-page.ts';
import type { PublicDeck } from '../../shared/src/saved-deck-types.ts';
const shell = readFileSync(new URL('../../app/index.html', import.meta.url), 'utf8');
const deck = { publicSlug: 'a'.repeat(32), visibility: 'public', title: '</script><img onerror="bad">', description: 'Description & details', owner: { displayName: 'A < B' }, decklist: { material: [{ card: 'Champion', quantity: 1 }], main: [{ card: 'Card', quantity: 3 }], sideboard: [{ card: 'Excluded', quantity: 1 }] } } as PublicDeck;
test('live HTML escapes text and schema, preserves startup, and exposes only main/material', () => {
  const html = renderCommunityDeckPage(shell, deck);
  assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes('&lt;img onerror='));
  assert.ok(html.includes('src="/src/main.tsx"'));
  assert.ok(html.includes('3 × Card'));
  assert.ok(!html.includes('Excluded'));
  assert.ok(html.includes('content="index, follow"'));
  const structured = JSON.parse(html.match(/type="application\/ld\+json">(.*?)<\/script>/s)![1]);
  assert.equal(structured.name, `${deck.title} · Fan of Insight`);
  assert.equal(structured.mainEntity.itemListElement.length, 2);
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
});
test('unlisted is noindex and missing shell fails closed', () => {
  assert.ok(renderCommunityDeckPage(shell, { ...deck, visibility: 'unlisted' }).includes('content="noindex, nofollow"'));
  assert.throws(() => renderCommunityDeckPage('<html></html>', deck), /Missing app shell/);
});

test('endpoint rechecks publication, suppresses HEAD bodies, and fails closed on shell errors', async () => {
  const { default: handler } = await import('../api/deck-page.ts');
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.ACCOUNT_WORKER_URL;
  const oldSecret = process.env.BFF_SHARED_SECRET;
  process.env.ACCOUNT_WORKER_URL = 'https://worker.example';
  process.env.BFF_SHARED_SECRET = 'test';
  let published = true;
  let shellFails = false;
  globalThis.fetch = async input => String(input).startsWith('https://worker.example')
    ? published ? Response.json({ deck: { ...deck, publishedAt: '2026-10-14' } }) : new Response('', { status: 404 })
    : new Response(shellFails ? 'error' : shell, { status: shellFails ? 500 : 200 });
  const invoke = async (method = 'GET') => {
    const headers = new Map(); let body: unknown;
    const response = { statusCode: 0, setHeader: (key: string, value: string) => headers.set(key, value), end: (value: unknown) => { body = value; } };
    await handler({ method, url: `/api/deck-page?slug=${deck.publicSlug}` } as never, response as never);
    return { status: response.statusCode, headers, body };
  };
  try {
    const good = await invoke();
    assert.equal(good.status, 200);
    assert.equal(good.headers.get('X-Robots-Tag'), 'noindex');
    assert.equal(good.headers.get('X-Deck-Indexable'), '1');
    assert.equal((await invoke('HEAD')).body, undefined);
    published = false;
    assert.equal((await invoke()).status, 404);
    published = true; shellFails = true;
    assert.equal((await invoke()).status, 503);
    assert.equal((await invoke('POST')).status, 405);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.ACCOUNT_WORKER_URL; else process.env.ACCOUNT_WORKER_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.BFF_SHARED_SECRET; else process.env.BFF_SHARED_SECRET = oldSecret;
  }
});
