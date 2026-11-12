import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeckFlight, transformDeck, shouldKeepAriDeck, type AriDeck } from './transform.js';
const raw = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')) as AriDeck;
test('live fixture preserves sections and counts; sideboard points are not copies', () => {
  const deck = transformDeck(raw);
  assert.equal(deck.mainCount, 60);
  assert.equal(deck.materialCount, 12);
  assert.equal(deck.sideCount, 11);
  assert.equal(deck.champion, 'Diana');
  assert.equal(shouldKeepAriDeck(deck), true);
  assert.deepEqual(deck.mainDeck[0], { name: 'Aetheric Calibration', quantity: 4 });
});
test('flight handles split chunks and ignores non-JSON records', () => {
  const flight = `1:I[123]\nf:${JSON.stringify(['$', 'component', null, { deck: raw }])}\n`;
  assert.deepEqual(parseDeckFlight([flight.slice(0,250),flight.slice(250)],raw.id),raw);
  assert.throws(() => parseDeckFlight([flight], 'missing'));
});
test('rejects private decks, malformed quantities, unsupported formats and zones', () => {
  assert.throws(() => transformDeck({ ...raw, is_public: false }));
  assert.throws(() => transformDeck({ ...raw, format: 'Unknown' }));
  assert.throws(() => transformDeck({ ...raw, cards: { ...raw.cards, main: [{name:'Card',count:-1}] } }));
  assert.throws(() => transformDeck({ ...raw, cards: { ...raw.cards, unknownZone: [{name:'Card',count:1}] } }));
  assert.throws(() => transformDeck({ ...raw, cards: { material: [] } }));
});

test('Ari source is searchable and deduplicates against existing collected builds', async () => {
  const { buildCommunityDeckSearchIndex } = await import('../community/blend.js');
  const { buildCollectedDecks } = await import('../community/collected.js');
  const deck = transformDeck(raw, '2026-11-12T00:00:00Z');
  const index = buildCommunityDeckSearchIndex([{ source: 'arisapothecary', decks: [deck] }]);
  assert.equal(index.decks[0].source, 'arisapothecary');
  assert.equal(index.decks[0].url, deck.url);
  const collected = buildCollectedDecks([deck, { ...deck, id: 'other-source', url: 'https://example.com/deck' }]);
  assert.equal(collected.decks.length, 1);
  assert.equal(collected.decks[0].variants.length, 1);
});

test('live Pantheon fixture preserves boons separately and excludes token references', () => {
  const raw = JSON.parse(readFileSync(new URL('./pantheon-fixture.json', import.meta.url), 'utf8')) as AriDeck;
  const deck = transformDeck(raw, '2026-11-12');
  assert.equal(deck.format, 'PANTHEON');
  assert.equal(deck.pantheonDeck?.length, 2);
  assert.equal(deck.materialCount, 12);
  assert.deepEqual(transformDeck({ ...raw, cards: { ...raw.cards, tokens: [{ name: 'Token', count: 20 }] } }, '2026-11-12'), deck);
});

test('missing publication is safe for existing pipelines; corrupted records fail visibly', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { pathToFileURL } = await import('node:url');
  const { listAriDecks } = await import('./run.js');
  const directory = await mkdtemp(`${tmpdir()}/ari-test-`);
  try {
    assert.deepEqual(await listAriDecks(pathToFileURL(`${directory}/missing/`)), []);
    await writeFile(`${directory}/deck.json`, JSON.stringify(transformDeck(raw)));
    assert.equal((await listAriDecks(pathToFileURL(`${directory}/`))).length, 1);
    await writeFile(`${directory}/deck.json`, '{broken');
    await assert.rejects(listAriDecks(pathToFileURL(`${directory}/`)));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
