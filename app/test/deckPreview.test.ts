import { test } from "node:test";
import assert from "node:assert/strict";
import { deckPreviewCards } from "@gatcg/shared";

test("deck preview uses a bounded deterministic sample of Main, preserving copy counts", () => {
  const deck = { main: [{card:"B",quantity:2},{card:"A",quantity:4},{card:"B",quantity:2},{card:"C",quantity:1},{card:"D",quantity:1}], material: [{card:"Champion",quantity:1}], sideboard: [{card:"Side",quantity:4}] };
  const before = JSON.stringify(deck);
  assert.deepEqual(deckPreviewCards(deck), [{card:"A",quantity:4},{card:"B",quantity:4},{card:"C",quantity:1}]);
  assert.equal(JSON.stringify(deck), before);
  assert.deepEqual(deckPreviewCards({...deck, main:[]}), []);
});

test("main-deck display groups elements and alphabetizes without changing the source list", async () => {
  const { sortDeckCardsByElement } = await import("@gatcg/shared");
  const catalog = new Map([
    ["Zebra", { element: "NORM" }], ["alpha", { element: "NORM" }],
    ["Tide", { element: "WATER" }], ["Burn", { element: "FIRE" }], ["Amber", { element: "FIRE" }],
  ]);
  const lines = [{ name: "Tide", quantity: 4 }, { name: "Zebra", quantity: 2 }, { name: "Unknown", quantity: 1 }, { name: "Burn", quantity: 3 }, { name: "alpha", quantity: 4 }, { name: "Amber", quantity: 2 }];
  const before = JSON.stringify(lines);
  const sorted = sortDeckCardsByElement(lines, catalog);
  assert.deepEqual(sorted.map(line => line.name), ["alpha", "Zebra", "Amber", "Burn", "Tide", "Unknown"]);
  assert.equal(JSON.stringify(lines), before);
  assert.equal(sorted.reduce((total, line) => total + line.quantity, 0), 16);
  assert.deepEqual(sortDeckCardsByElement(lines.map(({ name, quantity }) => ({ card: name, quantity })), catalog).map(line => line.card), sorted.map(line => line.name));
  assert.deepEqual(sortDeckCardsByElement([{ name: "Z" }, { name: "A" }], new Map()), [{ name: "A" }, { name: "Z" }]);
});
