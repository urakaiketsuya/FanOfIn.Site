import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectedDecks } from './collected.js';
import { isCollectedOnlyBuild, collectedDecklist, deckBuildSignature, shortHash, type ShoutAtYourDecksDeck } from '@gatcg/shared';
const fixture = (patch: Partial<ShoutAtYourDecksDeck> = {}): ShoutAtYourDecksDeck => ({ id: 'private-id', url: 'https://source.test/private-id', title: 'PRIVATE TITLE', author: 'PRIVATE USER', champion: 'PRIVATE CHAMPION', priceLow: null, materialCount: 1, mainCount: 60, sideCount: 1, fetchedAt: '2026-10-01T00:00:00Z', format: 'STANDARD', mainDeck: [{ name: 'Attack', quantity: 60 }], materialDeck: [{ name: 'Jin, Champion', quantity: 1 }], sideDeck: [{ name: 'Tech', quantity: 1 }], ...patch });
const catalog = [{ name: 'Jin, Champion', types: ['CHAMPION'], subtypes: [] }];
test('anonymous allowlist, stable build identity, variants and exact section handoffs', () => {
  const a = fixture();
  const b = fixture({ id: 'other', title: 'other title', author: 'another', sideDeck: [{ name: 'Tech', quantity: 2 }] });
  const data = buildCollectedDecks([a, b, a], catalog);
  assert.equal(data.decks.length, 1);
  assert.equal(data.decks[0].variants.length, 2);
  assert.equal(data.decks[0].championName, 'Jin');
  assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  assert.ok(!JSON.stringify(data).includes('source.test'));
  assert.equal(data.decks[0].tournamentHash, shortHash(deckBuildSignature(a.mainDeck, a.materialDeck)));
  const lists = data.decks[0].variants.map(v => collectedDecklist(v, data.cardNames));
  assert.deepEqual(lists.map(l => l.sideboard[0].quantity).sort(), [1, 2]);
  assert.ok(lists.every(l => l.main[0].quantity === 60 && l.material[0].card === 'Jin, Champion'));
  assert.deepEqual(buildCollectedDecks([b, a], catalog).decks, data.decks);
});
test('format isolation, Boons, invalid quantities, unknown champion and first collection date', () => {
  const standard = fixture();
  const pantheon = fixture({ format: 'PANTHEON', pantheonDeck: [{ name: 'Boon', quantity: 1 }] });
  const data = buildCollectedDecks([standard, pantheon, fixture({ fetchedAt: '2026-10-20' }), fixture({ mainDeck: [{ name: 'Attack', quantity: -1 }] })]);
  assert.equal(data.decks.length, 2);
  assert.ok(data.decks.every(d => d.championName === null));
  const p = data.decks.find(d => d.format === 'PANTHEON')!;
  assert.ok(collectedDecklist(p.variants[0], data.cardNames).material.some(l => l.card === 'Boon'));
  assert.equal(data.decks.find(d => d.format === 'STANDARD')!.collectedAt, '2026-10-01');
});
test('same card pool with changed quantities remains a different build', () => {
  assert.equal(buildCollectedDecks([fixture(), fixture({ mainDeck: [{ name: 'Attack', quantity: 59 }] })]).decks.length, 2);
});

test("tournament sightings replace Standard collected results without hiding Pantheon", () => {
  const data = buildCollectedDecks([fixture(), fixture({ format: "PANTHEON" })]);
  const hashes = new Set([data.decks[0].tournamentHash]);
  assert.deepEqual(data.decks.filter(d => isCollectedOnlyBuild(d, hashes)).map(d => d.format), ["PANTHEON"]);
  assert.equal(data.decks.filter(d => isCollectedOnlyBuild(d, new Set())).length, 2);
});
