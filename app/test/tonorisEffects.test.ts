import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { calculateCardScenarios, cardReportCheckpoints, defaultCardScenario, type Card } from '@gatcg/shared';
const cards = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
const catalog = new Map(cards.map(card => [card.name, card]));
const main = ['Blade of Creation', 'Archon Broadsword', 'Atmos Armor Type-Ares', 'Academy Guide', 'Storm of Thorns', 'Automata Genesis'].map(name => ({ name, quantity: 2 }));
const deck = { main, material: [] };
const state = { ...defaultCardScenario(), classes: ['GUARDIAN'], tokens: 4, shields: 2, guides: 2 };
const rows = (input = state) => calculateCardScenarios(deck, catalog, input);
const get = (id: string, input = state) => rows(input).find(row => row.id === id)!;
test('reviewed printed values and conditional class gates', () => {
  assert.equal(catalog.get('Blade of Creation')?.cost_reserve, 7);
  assert.equal(catalog.get('Archon Broadsword')?.power, 2);
  assert.equal(catalog.get('Atmos Armor Type-Ares')?.power, 1);
  assert.equal(get('Blade of Creation:token-cost').value, 3);
  assert.equal(get('Blade of Creation:token-cost', { ...state, tokens: 99 }).value, 0);
  assert.equal(get('Blade of Creation:token-cost', { ...state, classes: [] }).value, 7);
  assert.equal(get('Archon Broadsword:token-power').value, 6);
  assert.equal(get('Archon Broadsword:token-power', { ...state, classes: [] }).value, 2);
  assert.equal(get('Atmos Armor Type-Ares:shield-power').value, 3);
  assert.equal(get('Atmos Armor Type-Ares:shield-power', { ...state, classes: [] }).value, 1);
  assert.equal(get('Academy Guide:champion-discount').value, 2);
});
test('prevention is per event and excludes retaliation damage', () => {
  assert.equal(get('Storm of Thorns:prevent', { ...state, damage: 8, events: 1 }).value, 1);
  assert.equal(get('Storm of Thorns:prevent', { ...state, damage: 2, events: 3 }).value, 3);
  assert.equal(get('Storm of Thorns:prevent', { ...state, damage: 0, events: 3 }).value, 0);
  assert.deepEqual(cardReportCheckpoints(deck, catalog, state, get('Storm of Thorns:prevent')).map(p => p.value), [3, 1]);
});
test('reports show automatic cost checkpoints and distinct-source draw access', () => {
  assert.deepEqual(cardReportCheckpoints(deck, catalog, state, get('Blade of Creation:token-cost')).map(p => p.value), [7, 5, 3, 0]);
  const genesis = get('Automata Genesis:token-package');
  assert.deepEqual(genesis.support?.map(line => line.name), ['Atmos Armor Type-Ares']);
  assert.ok(genesis.value > 0 && genesis.value < 100);
  assert.ok(get('Automata Genesis:token-package', { ...state, seen: 20 }).value > genesis.value);
  assert.equal(calculateCardScenarios({ main: [], material: [] }, catalog, state).length, 0);
});
