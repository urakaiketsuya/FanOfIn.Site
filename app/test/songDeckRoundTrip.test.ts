import { encodeCustomDecks, decodeCustomDecks } from "../src/lib/compareShareLink";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canonicalizeSavedDecklist, savedDeckIdentityInput, extractDeckPrintings, withDeckPrintings, type Card } from '@gatcg/shared';
import { mergePreviewCards, officialCardNames, cardNameKey, isPreviewCard, previewCardImage } from '../src/lib/previewCards';
import { unlocksSongDeck } from '../src/lib/songDeck';
import { buildEditableDeckText } from '../src/lib/decklistText';
import { parseDecklist } from '../src/features/compare/parseDecklist';
import { decklistToWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspaceImport';
import { saveActiveDeckWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspace';
import { loadBuilderSessionSeed } from '../src/features/deckbuilder/persistence/builderSeed';
import { reviewSelections } from '../src/features/deck-review/reviewSelections';
const previews = JSON.parse(readFileSync(new URL('../../data/reference/card-spoilers-2026-11-01.json', import.meta.url), 'utf8')).cards;
const catalog = mergePreviewCards([], previews, true);
const deck = { main: [], material: [{ card: 'Casella, Volant Songstress', quantity: 1 }], sideboard: [], song: [{ card: 'Chromatic', quantity: 1, printings: [{ editionUuid: 'real-edition', quantity: 1 }] }] };

test('only level one Casella unlocks Songs using the actual spoiler records', () => {
  const casellas = catalog.filter(c => c.types.includes('CHAMPION') && c.name.startsWith('Casella,'));
  assert.equal(casellas.length, 3);
  assert.deepEqual(casellas.filter(unlocksSongDeck).map(c => c.name), ['Casella, Volant Songstress']);
});
test('preview browsing is opt-in, and disabling it preserves selected preview cards', () => {
  assert.equal(mergePreviewCards([], previews, false).length, 0);
  assert.deepEqual(mergePreviewCards([], previews, false, ['Chromatic']).map(c => c.name), ['Chromatic']);
  assert.ok(catalog.every(isPreviewCard));
});
test('official arrival replaces the entire preview including rules, identity, and editions', () => {
  const preview = catalog.find(c => c.name === 'Chromatic')!;
  const official = { ...preview, uuid: 'official-id', effect: 'Corrected official rules', cost: { type: 'aria', value: '3' }, subtypes: ['SONG'], editions: [{ uuid: 'official-printing' }] } as Card;
  const merged = mergePreviewCards([official], previews, true);
  assert.deepEqual(merged.filter(c => c.name === 'Chromatic'), [official]);
  assert.equal(isPreviewCard(merged.find(c => c.name === 'Chromatic')), false);
  const renamed = { ...official, name: 'Official Song Name' };
  const records = [{ ...previews.find((c: Card) => c.name === 'Chromatic'), aliases: ['Official Song Name'] }];
  assert.deepEqual(mergePreviewCards([renamed], records, true), [renamed]);
  assert.equal(officialCardNames([renamed], records).get(cardNameKey('Chromatic')), 'Official Song Name');
});
test('Song text, printings, canonical storage and review/workbench round trips preserve selections', () => {
  assert.deepEqual(parseDecklist(buildEditableDeckText(deck)).decklist, deck);
  const restored = withDeckPrintings(canonicalizeSavedDecklist(deck), extractDeckPrintings(deck));
  assert.deepEqual(restored.song, deck.song);
  assert.equal(savedDeckIdentityInput(deck), savedDeckIdentityInput({ ...deck, song: [] }));
  const workspace = decklistToWorkspace(deck, new Map(catalog.map(c => [c.name, c])), 'review');
  assert.deepEqual(workspace.song, [{ name: 'Chromatic', quantity: 1 }]);
  assert.equal(reviewSelections(workspace).sections.get('Chromatic'), 'song');
  const memory = new Map<string,string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } } as Storage;
  saveActiveDeckWorkspace(storage, workspace);
  const seed = loadBuilderSessionSeed(storage)!;
  assert.equal(seed.lockedSections.get('Chromatic'), 'song');
  assert.equal(seed.lockedCards.get('Chromatic'), 1);
  assert.deepEqual(seed.printings?.song, extractDeckPrintings(deck).song);
});

test("comparison links preserve Song cards", () => {
 const result = decodeCustomDecks(encodeCustomDecks([{ label: "Song", decklist: deck }]));
 assert.deepEqual(result[0].decklist.song, deck.song?.map(({card, quantity}) => ({card, quantity})));
});


test("spoiler art is available in card tiles but never overrides official art", () => {
  const preview = catalog.find(c => c.name === 'Chromatic')!;
  assert.equal(previewCardImage(preview), '/images/spoilers/chromatic.png');
  const official = { ...preview, uuid: 'official', editions: [] } as Card;
  assert.equal(previewCardImage(mergePreviewCards([official], previews, true).find(c => c.name === 'Chromatic')), undefined);
});

test("partial catalog cards retain the name fallback without an ID", () => {
  assert.equal(isPreviewCard({ name: "Unknown" } as Card), false);
  assert.equal(previewCardImage({ name: "Unknown" } as Card), undefined);
});

test('revealed Songs retain aria costs and Song deck classification', () => {
  for (const [name, value] of [['Skyward Requiem', '1'], ['Chromatic', '2'], ['Aiss Yustera', '5'], ['Let My Thunder Be Heard', '3']]) {
    const card = catalog.find(card => card.name === name)!;
    assert.deepEqual(card.cost, { type: 'aria', value });
    assert.ok(card.subtypes.includes('SONG'));
    assert.equal(card.cost_reserve, null);
    assert.ok(previewCardImage(card));
  }
});
