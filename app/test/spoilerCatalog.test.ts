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
