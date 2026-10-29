import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { deckSectionStats } from "../src/lib/deckSectionStats";

const card = (name: string, types: string[], extra = {}) => ({ name, types, elements: ["FIRE"], subtypes: ["Human"], cost_memory: null, cost_reserve: 2, ...extra }) as Card;
const catalog = new Map([
  ["Dual", card("Dual", ["ALLY", "ACTION"])],
  ["Action", card("Action", ["ACTION"])],
  ["Champion", card("Champion", ["CHAMPION"], { cost_memory: 2, cost_reserve: null })],
]);

test("overlapping types use all section copies, including unresolved copies", () => {
  const stats = deckSectionStats([{ card: "Dual", quantity: 3 }, { card: "Action", quantity: 1 }, { card: "Unknown", quantity: 2 }], catalog);
  assert.equal(stats.total, 6);
  assert.equal(stats.unresolved, 2);
  assert.deepEqual(stats.types, [{ label: "ACTION", count: 4, percent: 4 / 6 * 100 }, { label: "ALLY", count: 3, percent: 50 }]);
  assert.equal(stats.reserve.reduce((sum, bar) => sum + bar.value, 0), 4);
  assert.equal(stats.elements[0].count, 4);
});

test("sections stay separate and quantity edits update counts and ratios", () => {
  const deck = { main: [{ card: "Dual", quantity: 3 }, { card: "Action", quantity: 1 }], material: [{ card: "Champion", quantity: 1 }], sideboard: [{ card: "Action", quantity: 15 }] };
  assert.equal(deckSectionStats(deck.main, catalog).types.find(row => row.label === "ALLY")?.percent, 75);
  const updated = deckSectionStats([{ ...deck.main[0], quantity: 1 }, deck.main[1]], catalog);
  assert.equal(updated.types.find(row => row.label === "ALLY")?.percent, 50);
  const material = deckSectionStats(deck.material, catalog);
  assert.equal(material.total, 1);
  assert.equal(material.types[0].percent, 100);
  assert.equal(material.memory.reduce((sum, bar) => sum + bar.value, 0), 0);
});

test("empty and entirely unresolved sections do not invent statistics", () => {
  const empty = deckSectionStats([], catalog);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.types, []);
  const unknown = deckSectionStats([{ card: "Missing", quantity: 4 }], catalog);
  assert.equal(unknown.unresolved, 4);
  assert.deepEqual(unknown.types, []);
});

import { basicDeckStats } from '@gatcg/shared';

test('basic stats aggregate duplicate names and keep every chart membership aligned', () => {
  const stats = basicDeckStats([{ card: 'Dual', quantity: 2 }, { card: 'Dual', quantity: 1 }, { card: 'Missing', quantity: 2 }], catalog);
  assert.equal(stats.unique, 2);
  assert.equal(stats.total, 5);
  assert.equal(stats.copies.find(row => row.label === '3× per card')?.lines[0].quantity, 3);
  assert.equal(stats.reserve.find(row => row.label === 'Unknown')?.count, 2);
  for (const rows of [stats.types, stats.copies, stats.reserve]) for (const row of rows) {
    assert.equal(row.count, row.lines.reduce((sum, line) => sum + line.quantity, 0));
    assert.equal(row.percent, row.count / 5 * 100);
  }
});

test('basic stats preserve variable, zero, absent costs and separate champion progression', () => {
  const cards = new Map(catalog);
  cards.set('Variable', card('Variable', ['ACTION'], { cost_reserve: -1 }));
  cards.set('Free', card('Free', ['ACTION'], { cost_reserve: 0 }));
  cards.set('None', card('None', ['REGALIA'], { cost_reserve: null }));
  const stats = basicDeckStats(['Variable', 'Free', 'None', 'Champion'].map(card => ({ card, quantity: 1 })), cards);
  assert.deepEqual(stats.reserve.map(row => row.label), ['0', 'X', '—']);
  assert.equal(stats.progression[0].label, '2');
  assert.equal(stats.progression[0].count, 1);
});

test('Floating Memory counts each printed condition once per card without assuming activation', () => {
  const cards = new Map([
    ['Base', card('Base', ['ACTION'], { effect: '**Floating Memory**\n**Floating Memory**' })],
    ['Conditional', card('Conditional', ['ACTION'], { effect: '[Class Bonus] **Floating Memory**\n[Level 2+] **Floating Memory**' })],
  ]);
  const stats = basicDeckStats([{ card: 'Base', quantity: 3 }, { card: 'Conditional', quantity: 2 }], cards);
  assert.deepEqual(stats.floating.map(row => [row.label, row.count]), [['Base', 3], ['Conditional · Class Bonus', 2], ['Conditional · Level 2+', 2]]);
});

test('composition projection preserves full statistics without computing unused card traits', () => {
  const lines = [{ card: 'Dual', quantity: 3 }, { card: 'Champion', quantity: 1 }, { card: 'Missing', quantity: 2 }];
  const full = basicDeckStats(lines, catalog);
  const composition = basicDeckStats(lines, catalog, 'composition');
  for (const key of ['total', 'unique', 'unresolved', 'types', 'elements', 'reserve', 'memory', 'progression'] as const) assert.deepEqual(composition[key], full[key]);
  assert.deepEqual(composition.keywords, []);
  assert.deepEqual(composition.floating, []);
});
