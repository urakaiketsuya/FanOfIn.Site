import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFractalDeckLink } from '@gatcg/shared';
import { decodeFractalDeck, previewDeckLink } from '../src/deck-links';
import type { Env } from '../src/auth';

const root = 'https://fractalofin.site';
test('Fractal links resolve event, player and exact list variant', () => {
  for (const path of ['/s26/123.html#deck_456', '/player/456.html#deck_123', '/deck/lorraine.html#deck_123_456', '/card/reposition.html#deck_123_456', '/champion/lorraine.html#deck_123_456', '/tts/event_123/456.json']) {
    for (const topcut of [false, true]) {
      const link = topcut ? path.replace(/(\.json|$)/, '_topcut$1') : path;
      const ref = parseFractalDeckLink(root + link);
      assert.equal(ref.eventId, 123); assert.equal(ref.playerId, 456); assert.equal(ref.topcut, topcut);
      assert.equal(ref.exportPath, `/tts/event_123/456${topcut ? '_topcut' : ''}.json`);
    }
  }
});
test('rejects ambiguous links, hostile hosts, credentials, invalid IDs and unsupported schemes', () => {
  for (const link of [root + '/player/456.html', root + '/s26/123.html#deck_0', root + '/s26/9007199254740992.html#deck_456', 'https://fractalofin.site.evil.test/s/123.html#deck_456', 'https://user@fractalofin.site/s/123.html#deck_456', 'http://fractalofin.site/s/123.html#deck_456', 'https://fractalofin.site:123/s/123.html#deck_456', root + '/player/456.html#deck_123_789']) assert.throws(() => parseFractalDeckLink(link));
  assert.equal(parseFractalDeckLink('https://www.fractalofin.site/s/123.html#deck_456').eventId, 123);
});
const payload = { cards: { main: [{ name: 'A', quantity: 4 }], material: [{ name: 'B', quantity: 1 }], sideboard: [{ name: 'C', quantity: 2 }], references: [{ name: 'Token' }] } };
test('converts only deck sections and rejects invalid quantities or incomplete lists', () => {
  assert.deepEqual(decodeFractalDeck(payload), { main: [{ card: 'A', quantity: 4 }], material: [{ card: 'B', quantity: 1 }], sideboard: [{ card: 'C', quantity: 2 }] });
  for (const value of [null, {}, { cards: { ...payload.cards, main: [{ name: 'A', quantity: -1 }] } }, { cards: { ...payload.cards, main: [{ name: '', quantity: 1 }] } }]) assert.throws(() => decodeFractalDeck(value));
});
test('fetches only fixed export paths, never silently falls back, and rejects top cut archive substitution', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const env = { ASSET_BASE_URL: 'https://fanofin.site' } as Env;
  try {
    globalThis.fetch = async (input, init) => { calls.push(String(input)); assert.equal(init?.redirect, 'manual'); return Response.json(payload); };
    const preview = await previewDeckLink(env, root + '/s26/123.html#deck_456_topcut');
    assert.equal(preview.topcut, true);
    assert.deepEqual(calls, [root + '/tts/event_123/456_topcut.json']);
    await assert.rejects(previewDeckLink(env, root + '/s26/123.html#deck_456_topcut', 'omnidex'));
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(previewDeckLink(env, root + '/s26/123.html#deck_456'), /could not be loaded/);
    globalThis.fetch = async input => { calls.push(String(input)); return Response.json({ decklists: [{ player: 456, decklist: decodeFractalDeck(payload) }] }); };
    const archive = await previewDeckLink(env, root + '/s26/123.html#deck_456', 'omnidex');
    assert.equal(archive.origin, 'omnidex');
    assert.equal(calls.at(-1), 'https://fanofin.site/data/omnidex/events/123.json');
  } finally { globalThis.fetch = original; }
});

test('link import retains source and sections across duplicate saves', async () => {
  const { databaseFixture } = await import('./helpers/database');
  const { saveDeck } = await import('../src/decks');
  const { parseSaveInput } = await import('../src/deck-input');
  const { db, env } = databaseFixture();
  try {
    db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('link-user','link-user','link@example.test','Link','now','now')");
    const sourceUrl = root + '/s26/123.html#deck_456_topcut';
    const input = parseSaveInput({ title: 'Imported list', format: 'UNKNOWN', decklist: decodeFractalDeck(payload), source: { provider: 'manual', externalDeckId: 'fractal:123:456:topcut:fractal', label: 'Fractal of Insight', sourceUrl, metadata: { eventId: 123, playerId: 456, topcut: true, origin: 'fractal' } } });
    const user = { id: 'link-user' } as import('../src/auth').AuthUser;
    const saved = await saveDeck(env, user, input);
    assert.deepEqual(await saveDeck(env, user, input), { id: saved.id, created: false });
    const source = db.prepare('SELECT * FROM saved_deck_sources').get()!;
    assert.equal(source.source_url, sourceUrl);
    assert.equal(source.label, 'Fractal of Insight');
    assert.equal(JSON.parse(String(source.metadata_json)).topcut, true);
    assert.deepEqual(JSON.parse(String(source.sideboard_json)), [{ card: 'C', quantity: 2 }]);
    assert.equal(db.prepare('SELECT count(*) n FROM saved_deck_sources').get()!.n, 1);
    assert.equal(db.prepare('SELECT count(*) n FROM external_profiles').get()!.n, 0);
  } finally { db.close(); }
});
