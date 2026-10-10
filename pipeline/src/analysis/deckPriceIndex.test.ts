import test from "node:test";
import assert from "node:assert/strict";
import { buildDeckPriceIndex } from "./deckPriceIndex.js";

test("price projection preserves unknown, zero, decimal, duplicate and ordered prices", () => {
  const sightings = [
    { deckId: "1:1", price: null }, { deckId: "1:2", price: 0 },
    { deckId: "2:1", price: 12.34 }, { deckId: "2:1", price: 56.78 },
  ];
  const index = buildDeckPriceIndex(sightings, "generation");
  assert.deepEqual(index, { generatedAt: "generation", entries: [
    ["1:1", null], ["1:2", 0], ["2:1", 12.34], ["2:1", 56.78],
  ] });
  const before = new Map(sightings.map(s => [s.deckId, s.price]));
  const after = new Map(JSON.parse(JSON.stringify(index)).entries);
  for (const ids of [["missing", "1:1", "1:2", "2:1"], ["2:1"], ["missing"], ["1:1"]]) {
    assert.equal(ids.map(id => after.get(id)).find(p => p != null) ?? null,
      ids.map(id => before.get(id)).find(p => p != null) ?? null);
  }
  assert.deepEqual(buildDeckPriceIndex([], "empty"), { generatedAt: "empty", entries: [] });
});
