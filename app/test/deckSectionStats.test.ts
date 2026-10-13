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
