import { cardLegalityStatus } from "@gatcg/shared";
import test from 'node:test';
import assert from 'node:assert/strict';
import { withSpoilerCards } from '../src/lib/spoilerCatalog';
import { findDeckChampionName } from '../src/lib/ttsExport';
import { previewCardImage } from '../src/lib/previewCards';

test('shared catalog resolves CBL art and champion identity without official sync', () => {
  const cards = withSpoilerCards([]);
  const champion = cards.find(card => card.name === "Casella, Sky's Cantatrice");
  assert.ok(champion);
  assert.ok(previewCardImage(champion));
  assert.equal(cardLegalityStatus(champion, "STANDARD"), "unverified");
  assert.equal(findDeckChampionName([{ card: champion.name, quantity: 1 }], new Map(cards.map(card => [card.name, card]))), champion.name);
  const official = { ...champion, uuid: 'official-casella' };
  assert.equal(withSpoilerCards([official]).filter(card => card.name === champion.name).length, 1);
  assert.equal(withSpoilerCards([official]).find(card => card.name === champion.name)?.uuid, official.uuid);
});

import { cardImagePath, mergePreviewCards } from '../src/lib/previewCards';
import { filterCards, emptyFilterState } from '../src/features/cards/filters';
import { buildTtsSaveFile } from '../src/lib/ttsExport';
import { deckImageSections } from '../src/lib/deckImage';
import { gatcgApi } from '../src/lib/api/client';
import spoilers from '../../data/reference/card-spoilers-2026-11-01.json';
import { existsSync } from 'node:fs';
import { searchSetPrefix } from '@gatcg/shared';

test('Deploy the Future is available in CBL deck building and retained in restored drafts', () => {
  const cards = filterCards(withSpoilerCards([]), { ...emptyFilterState(), name: 'Deploy the Future', sets: new Set(['CBL']) });
  assert.equal(cards.length, 1);
  const card = cards[0];
  assert.deepEqual(card.types, ['ACTION']);
  assert.deepEqual(card.classes, ['TAMER']);
  assert.equal(card.element, 'FIRE');
  assert.equal(card.cost_reserve, 2);
  assert.equal(card.speed, false);
  assert.equal(cardImagePath(card), '/images/spoilers/deploy-the-future.webp');
  assert.equal(mergePreviewCards([], spoilers.cards, false, [card.name])[0].name, card.name);
});

test('gallery additions resolve in CBL searches with artwork and printed costs', () => {
  const catalog = withSpoilerCards([]);
  const cbl = filterCards(catalog, { ...emptyFilterState(), sets: new Set(['CBL']) });
  for (const [name, power, life] of [['Gusty Fan', 2, 3], ['Tailwind Vestal', 1, 4]] as const) {
    const card = cbl.find(card => card.name === name);
    assert.ok(card, `${name} is searchable`);
    assert.equal(card.power, power);
    assert.equal(card.life, life);
    assert.equal(card.cost_reserve, 3);
    assert.ok(existsSync(new URL(`../public${cardImagePath(card)}`, import.meta.url)));
  }
  for (const card of catalog.filter(card => card.types.includes('REGALIA'))) {
    assert.equal(card.cost.type, 'memory', card.name);
    assert.equal(card.cost_memory, 0, card.name);
    assert.equal(card.cost_reserve, null, card.name);
  }
  assert.equal(searchSetPrefix('CBLOS'), 'CBL');
  assert.ok(cbl.some(card => card.name === 'Let My Thunder Be Heard'));
});

test('gallery printing references all have local artwork without duplicate identities', () => {
  assert.equal(new Set(spoilers.cards.map(card => card.name)).size, spoilers.cards.length);
  for (const card of spoilers.cards) {
    for (const printing of [card, ...('altPrintings' in card ? card.altPrintings ?? [] : [])]) {
      assert.ok(existsSync(new URL(`../public/images/spoilers/${printing.image}`, import.meta.url)), printing.image);
    }
  }
});

test('CBL search, artwork, and both exports retain spoiler copies', () => {
  const catalog = withSpoilerCards([]);
  const selected = filterCards(catalog, { ...emptyFilterState(), name: 'Casella', sets: new Set(['CBL']) });
  assert.ok(selected.some(card => card.name === "Casella, Sky's Cantatrice"));
  const card = selected.find(card => card.name === "Casella, Sky's Cantatrice")!;
  const cards = new Map(catalog.map(card => [card.name, card]));
  const lines = [{ card: card.name, quantity: 2 }];
  assert.match(gatcgApi.imageUrl(cardImagePath(card)), /^\/images\/spoilers\//);
  const exported = buildTtsSaveFile([{ label: 'Material', lines }], cards).ObjectStates[0];
  assert.equal(exported.Name, 'DeckCustom');
  assert.equal('ContainedObjects' in exported && exported.ContainedObjects.length, 2);
  assert.match(exported.CustomDeck['1'].FaceURL, /^https:\/\/fanofin.site\/images\/spoilers\//);
  assert.equal(deckImageSections([{ title: 'Material', lines }], cards)[0].tiles[0].image, cardImagePath(card));
  assert.equal(mergePreviewCards([], spoilers.cards, false).length, 0);
  assert.equal(mergePreviewCards([], spoilers.cards, false, [card.name])[0].name, card.name);
});
