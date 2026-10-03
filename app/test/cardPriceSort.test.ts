import assert from "node:assert/strict";
import test from "node:test";
import { compareCardPrices } from "../src/lib/cardPriceSort";
import { sortCatalogNames } from "../src/components/deck-editor/catalogFilters";

test("price sorting handles zero, ties and missing quotes in both directions", () => {
  const names = ["Unknown", "Expensive", "Beta", "Alpha", "Free"];
  const prices = new Map([["Expensive", 100], ["Beta", 2], ["Alpha", 2], ["Free", 0]]);
  assert.deepEqual([...names].sort((a, b) => compareCardPrices(a, b, prices)), ["Free", "Alpha", "Beta", "Expensive", "Unknown"]);
  assert.deepEqual(sortCatalogNames(names, new Map(), "price-desc", prices), ["Expensive", "Alpha", "Beta", "Free", "Unknown"]);
  assert.deepEqual(sortCatalogNames(names, new Map(), "price", new Map()), [...names].sort());
  assert.equal(names[0], "Unknown");
});

test("invalid quotes cannot rank as free or expensive cards", () => {
  const prices = new Map([["Invalid", NaN], ["Negative", -1], ["Infinite", Infinity], ["Known", 5]]);
  for (const descending of [true, false]) {
    assert.deepEqual([...prices.keys()].sort((a,b) => compareCardPrices(a,b,prices,descending)), ["Known", "Infinite", "Invalid", "Negative"]);
  }
});
