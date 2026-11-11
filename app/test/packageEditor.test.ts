import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { editDeck, packageAdditions, type EditableDeck } from '../src/lib/deckEditing.ts';
import { addCardToSnapshot } from '../src/features/account/cardDeckDraft.ts';
import { parseDecklist } from '../src/features/compare/parseDecklist.ts';
const ally = { name: 'Ally', types: ['ALLY'], subtypes: [] } as unknown as Card;
const spirit = { name: 'Spirit', types: ['CHAMPION'], subtypes: ['SPIRIT'] } as unknown as Card;
const catalog = new Map([[ally.name, ally], [spirit.name, spirit]]);
test('package import preserves existing copies, other sections and repeated imports', () => {
  const deck: EditableDeck = { main: [{ card: 'Ally', quantity: 2 }], material: [], sideboard: [], maybeboard: [{ card: 'Other', quantity: 3 }] };
  const cards = [{ name: 'Ally', section: 'main' as const, quantity: 4 }, { name: 'Ally', section: 'sideboard' as const, quantity: 4 }, { name: 'Spirit', section: 'material' as const, quantity: 1 }];
  const result = editDeck(deck, { type: 'add-many', additions: packageAdditions(deck, cards) }, catalog);
  assert.equal(result.main[0].quantity, 4);
  assert.equal(result.sideboard[0].quantity, 4);
  assert.equal(result.material[0].quantity, 1);
  assert.deepEqual(result.maybeboard, deck.maybeboard);
  assert.equal(deck.main[0].quantity, 2);
  assert.deepEqual(packageAdditions(result, cards), []);
});
test('invalid package section rolls back the entire addition', () => {
  const deck: EditableDeck = { main: [], material: [], sideboard: [], maybeboard: [] };
  assert.equal(editDeck(deck, { type: 'add-many', additions: [{ name: 'Ally', section: 'main', quantity: 4 }, { name: 'Ally', section: 'material', quantity: 1 }] }, catalog), deck);
});
test('card page addition preserves draft and adds only requested copies in selected section', () => {
  const initial = { deckText: 'Main\n2 Ally\nSideboard\n1 Ally', maybeboardText: '3 Other' };
  const next = addCardToSnapshot(initial, { card: ally, section: 'sideboard', quantity: 2 });
  const deck = parseDecklist(next.deckText).decklist;
  assert.equal(deck.main[0].quantity, 2);
  assert.equal(deck.sideboard[0].quantity, 3);
  assert.equal(next.maybeboardText, '3 Other');
  assert.throws(() => addCardToSnapshot(initial, { card: ally, section: 'material', quantity: 1 }));
  assert.throws(() => addCardToSnapshot(initial, { card: ally, section: 'main', quantity: 0 }));
});
