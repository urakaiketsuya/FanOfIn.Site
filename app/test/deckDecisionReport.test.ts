import assert from 'node:assert/strict';
import test from 'node:test';
import type { Card } from '@gatcg/shared';
import { comparableReportDecks, suggestReportSwaps, type ComparableDeck } from '../src/features/deck-analysis/reportModel';
import { persistReportSwap } from '../src/features/deck-analysis/reportDraft';
import { loadActiveDeckWorkspace, type DeckWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspace';
import { swapMainCard } from '../src/lib/deckEditing';
const card = (name: string, types = ['ACTION']) => ({ name, types, elements: ['NORM'], legality: { STANDARD: { limit: 4 } } } as Card);
const catalog = new Map(['Turbo Charge', 'Backup Charger', 'Filler', 'Other'].map(name => [name, card(name, name === 'Backup Charger' ? ['REGALIA'] : ['ACTION'])]));
const deck: DeckWorkspace = { version: 1, updatedAt: '', source: 'analysis', title: 'Test', sourceLabel: null, championName: 'Test', spiritName: null, format: 'STANDARD', main: [{ name: 'Turbo Charge', quantity: 2 }, { name: 'Filler', quantity: 4 }, { name: 'Other', quantity: 54 }], material: [{ name: 'Backup Charger', quantity: 1 }], sideboard: [], maybeboard: [] };
const reference: ComparableDeck = { deckId: '1:2', main: new Map([['Turbo Charge', 3], ['Filler', 3], ['Other', 54]]), material: new Map([['Backup Charger', 1]]), sideboard: new Map(), spiritName: null, winRate: .5, eventDate: '2026-10-01', similarity: .9 };
test('comparables enforce build membership, elemental identity, dates and unique deck IDs', () => {
  const fire = card('Fire Spirit', ['CHAMPION']); fire.elements = ['FIRE'];
  const cards = new Map([...catalog, ['Fire Spirit', fire]]);
  const rows = [reference, reference, { ...reference, deckId: '2:3', eventDate: '2020-01-01' }, { ...reference, deckId: '3:4' }, { ...reference, deckId: '4:5', material: new Map([['Fire Spirit', 1]]) }];
  const found = comparableReportDecks(deck, rows, { '1:2': 'build', '2:3': 'build', '3:4': 'other', '4:5': 'build' }, 'build', cards);
  assert.deepEqual(found.map(row => row.deckId), ['1:2']);
  assert.equal(comparableReportDecks(deck, rows, {}, undefined, cards).length, 0);
});
test('suggestions require a goal signal and respect locks, legality and printing assignments', () => {
  const get = (d = deck, locks = new Set<string>(), goal: 'consistency' | 'matchup' = 'consistency') => suggestReportSwaps(d, [reference], catalog, goal, locks, '');
  assert.equal(get()[0].add, 'Turbo Charge');
  assert.equal(get()[0].cut, 'Filler');
  assert.deepEqual(get(deck, new Set(['Filler'])), []);
  assert.deepEqual(get(deck, new Set(), 'matchup'), []);
  assert.deepEqual(get({ ...deck, format: 'PANTHEON' }), []);
  assert.deepEqual(get({ ...deck, sideboard: [{ name: 'Turbo Charge', quantity: 2 }] }), []);
  assert.deepEqual(get({ ...deck, printings: { main: { Filler: [{ editionUuid: 'edition', quantity: 1 }] } } }), []);
});
test('preserved package cannot lose access', () => {
  const opposite = { ...reference, main: new Map([['Turbo Charge', 1], ['Filler', 5], ['Other', 54]]) };
  assert.deepEqual(suggestReportSwaps(deck, [opposite], catalog, 'alternatives', new Set(), 'turbo-charge-backup-charger'), []);
});
test('atomic draft write, failure recovery, repeat preview and original survive reload', () => {
  const swap = suggestReportSwaps(deck, [reference], catalog, 'consistency', new Set(), '')[0];
  let saved = JSON.stringify(deck), writes = 0;
  const storage = { setItem: (_key: string, value: string) => { saved = value; writes++; }, getItem: () => saved };
  const next = persistReportSwap(storage, deck, swap, catalog);
  assert.equal(writes, 1);
  assert.equal(next.main.reduce((n, line) => n + line.quantity, 0), 60);
  assert.equal(deck.main[0].quantity, 2);
  const loaded = loadActiveDeckWorkspace(storage)!;
  assert.deepEqual(JSON.parse(loaded.reportOriginal!), deck);
  const beforeFailure = saved;
  assert.throws(() => persistReportSwap({ setItem: () => { throw new Error('quota'); } }, loaded, swap, catalog));
  assert.equal(saved, beforeFailure);
  const again = persistReportSwap(storage, loaded, swap, catalog);
  assert.equal(again.reportOriginal, loaded.reportOriginal);
  assert.equal(again.main.find(line => line.name === 'Turbo Charge')!.quantity, 4);
  assert.throws(() => persistReportSwap(storage, again, swap, catalog));
  assert.equal(writes, 2);
});
test('immutable swaps aggregate duplicate input lines, conserve copies, and reject material cards', () => {
  const editable = { main: [{ card: 'Filler', quantity: 1 }, { card: 'Filler', quantity: 2 }], material: [], sideboard: [], maybeboard: [] };
  assert.deepEqual(swapMainCard(editable, 'Filler', 'Turbo Charge', catalog)?.main, [{ card: 'Filler', quantity: 2 }, { card: 'Turbo Charge', quantity: 1 }]);
  assert.equal(swapMainCard(editable, 'Filler', 'Backup Charger', catalog), null);
  assert.equal(editable.main.length, 2);
});

test('null legality is unrestricted; absent format records and bans remain ineligible', () => {
  const nullCatalog = new Map(catalog); nullCatalog.set('Turbo Charge', { ...catalog.get('Turbo Charge')!, legality: null });
  assert.ok(suggestReportSwaps(deck, [reference], nullCatalog, 'consistency', new Set(), '').length);
  for (const legality of [{}, { STANDARD: { limit: 0 } }]) {
    nullCatalog.set('Turbo Charge', { ...catalog.get('Turbo Charge')!, legality });
    assert.deepEqual(suggestReportSwaps(deck, [reference], nullCatalog, 'consistency', new Set(), ''), []);
  }
});
