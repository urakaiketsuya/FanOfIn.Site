import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { budgetReplacements, type BudgetSwapContext } from '../src/features/deckbuilder/budgetReplacements.ts';
import { editDeck } from '../src/lib/deckEditing.ts';
const now = Date.parse('2026-10-30T12:00:00Z');
const card = (name: string, extra: Partial<Card> = {}): Card => ({ uuid: name, slug: name, name, types: ['ACTION'], subtypes: ['SPELL'], elements: ['NORM'], element: 'NORM', effect: 'Draw two cards, then discard a card.', effect_raw: 'Draw two cards, then discard a card.', cost: { type: 'reserve', value: '2' }, power: null, life: null, durability: null, legality: null, editions: [], references: [], referenced_by: [], ...extra } as Card);
function fixture(extra: Card[] = []): BudgetSwapContext {
  const cards = [card('Expensive'), card('Cheap'), ...extra];
  return { deck: { main: [{ card: 'Expensive', quantity: 3 }], material: [], sideboard: [], maybeboard: [] }, catalog: new Map(cards.map(c => [c.name, c])), prices: new Map([['Expensive', 10], ['Cheap', 1], ...extra.map(c => [c.name, .5] as [string, number])]), pricesAsOf: new Date(now).toISOString(), now, protectedNames: new Set() };
}
test('quantity savings, complete immutable replacement and re-evaluation', () => {
  const context = fixture();
  const swap = budgetReplacements(context, 'Expensive', 3)[0];
  assert.equal(swap.savings, 27);
  const after = editDeck(context.deck, { type: 'replace-main', name: swap.from.name, replacement: swap.to.name, quantity: 3 }, context.catalog);
  assert.deepEqual(after.main, [{ card: 'Cheap', quantity: 3 }]);
  assert.equal(context.deck.main[0].quantity, 3);
  assert.deepEqual(budgetReplacements({ ...context, deck: after }, 'Expensive', 3), []);
});
test('fails closed on stale, future, missing and invalid quotes; zero is a quote', () => {
  const c = fixture();
  for (const pricesAsOf of [undefined, 'bad', '2026-10-01', '2026-11-01']) assert.equal(budgetReplacements({ ...c, pricesAsOf }, 'Expensive', 1).length, 0);
  for (const price of [NaN, Infinity, -1]) { c.prices.set('Cheap', price); assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0); }
  c.prices.delete('Cheap'); assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
  c.prices.set('Cheap', 0); assert.equal(budgetReplacements(c, 'Expensive', 1)[0].savings, 10);
});
test('protects packages, selected printings, and quantities; counts sideboard toward limits', () => {
  const c = fixture();
  c.protectedNames.add('Expensive'); assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
  c.protectedNames.clear();
  for (const q of [0, -1, 4, 1.5, NaN]) assert.equal(budgetReplacements(c, 'Expensive', q).length, 0);
  c.deck.sideboard = [{ card: 'Cheap', quantity: 3 }];
  assert.equal(budgetReplacements(c, 'Expensive', 2).length, 0);
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 1);
  c.deck.main[0].printings = [{ editionUuid: 'owned-print', quantity: 1 }];
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
});
test('rejects banned, unknown legality, incompatible elements, tokens and champions', () => {
  for (const extra of [{ legality: { STANDARD: { limit: 0 } } }, { legality: {} }, { elements: ['FIRE'] }, { types: ['TOKEN'] }, { types: ['CHAMPION'] }, { types: ['REGALIA'] }]) {
    const c = fixture(); c.catalog.set('Cheap', card('Cheap', extra as Partial<Card>));
    assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
  }
});
test('preserves directional token intent; producer cannot be replaced by consumer', () => {
  const producer = card('Expensive', { effect: '**Summon** a Powercell token. Draw a card.', effect_raw: 'Summon a Powercell token. Draw a card.' });
  const payoff = card('Payoff', { effect: 'Sacrifice a Powercell: Draw a card.' });
  const good = card('Cheap', { effect: producer.effect, effect_raw: producer.effect_raw });
  const c = fixture([payoff]); c.catalog.set('Expensive', producer); c.catalog.set('Cheap', good); c.deck.main.push({ card: 'Payoff', quantity: 3 });
  assert.deepEqual(budgetReplacements(c, 'Expensive', 1).map(row => row.to.name), ['Cheap']);
  c.catalog.set('Cheap', card('Cheap', { effect: 'Draw a card. Recover 1.' }));
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
});
test('protects named links and new resource requirements', () => {
  const c = fixture([card('Important Partner')]);
  c.deck.material.push({ card: 'Important Partner', quantity: 1 });
  c.catalog.set('Expensive', card('Expensive', { references: [{ slug: 'Important Partner' }] as Card['references'] }));
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
  c.catalog.set('Expensive', card('Expensive'));
  c.catalog.set('Cheap', card('Cheap', { effect: 'Draw two cards, then discard a card. Sacrifice a Powercell.' }));
  assert.ok(!budgetReplacements(c, 'Expensive', 1).some(row => row.to.name === 'Cheap'));
});
test('partial replacement merges destination and conserves all sections', () => {
  const c = fixture(); c.deck.main.push({ card: 'Cheap', quantity: 1 }); c.deck.sideboard = [{ card: 'Cheap', quantity: 1 }];
  const after = editDeck(c.deck, { type: 'replace-main', name: 'Expensive', replacement: 'Cheap', quantity: 2 }, c.catalog);
  assert.deepEqual(after.main, [{ card: 'Expensive', quantity: 1 }, { card: 'Cheap', quantity: 3 }]);
  assert.equal(after.sideboard, c.deck.sideboard);
  for (const quantity of [0, 4, NaN]) assert.equal(editDeck(c.deck, { type: 'replace-main', name: 'Expensive', replacement: 'Cheap', quantity }, c.catalog), c.deck);
});
test('role matches require opt-in and a concrete shared role; effect matches rank first', () => {
  const c = fixture([card('Broad draw', { effect: 'Draw a card. Recover 2.', effect_raw: 'Draw a card. Recover 2.' })]);
  assert.deepEqual(budgetReplacements(c, 'Expensive', 1).map(r => r.to.name), ['Cheap']);
  const broader = budgetReplacements({ ...c, includeRoleMatches: true }, 'Expensive', 1);
  assert.deepEqual(broader.map(r => r.to.name), ['Cheap', 'Broad draw']);
  assert.equal(broader[1].match, 'Shared role');
});
test('UNIQUE alone is not a shared card type', () => {
  const c = fixture();
  c.catalog.set('Expensive', card('Expensive', { types: ['UNIQUE', 'ALLY'] }));
  c.catalog.set('Cheap', card('Cheap', { types: ['UNIQUE', 'ITEM'] }));
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
});
test('unknown active cards pause dependency checks, while unknown maybeboard does not', () => {
  const c = fixture(); c.deck.maybeboard.push({ card: 'Unknown', quantity: 1 });
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 1);
  c.deck.sideboard.push({ card: 'Unknown', quantity: 1 });
  assert.equal(budgetReplacements(c, 'Expensive', 1).length, 0);
});
