import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { emptyCatalogFilters, filterCatalog, sortCatalogNames } from "../src/components/deck-editor/catalogFilters";

test("recommendation order preserves ranked and ownership-prioritized input without mutating it", () => {
  const names = ["Zephyr", "Abnegation", "Dungeon Guide"];
  const result = sortCatalogNames(names, new Map(), "recommended");
  assert.deepEqual(result, names);
  assert.notEqual(result, names);
  assert.deepEqual(sortCatalogNames(names, new Map(), "name"), ["Abnegation", "Dungeon Guide", "Zephyr"]);
  assert.deepEqual(names, ["Zephyr", "Abnegation", "Dungeon Guide"]);
});

test("win rates sort descending, retain zero, put missing data last and break ties by name", () => {
  const names = ["Unknown", "Zero", "Beta", "Alpha"];
  const rates = new Map([["Zero", 0], ["Beta", 0.6], ["Alpha", 0.6]]);
  assert.deepEqual(sortCatalogNames(names, new Map(), "win-rate", new Map(), rates), ["Alpha", "Beta", "Zero", "Unknown"]);
  assert.deepEqual(names, ["Unknown", "Zero", "Beta", "Alpha"]);
});


test("deck element filter keeps neutral cards and identity choices and can be cleared", () => {
  const card = (name: string, elements: string[], types = ["ALLY"]) => ({ name, elements, types, classes: [], subtypes: [], editions: [] }) as unknown as Card;
  const cards = [card("Neutral", ["NORM"]), card("Fire", ["FIRE"]), card("Water", ["WATER"]), card("Spirit", ["WATER"], ["CHAMPION"]), card("Elementless", [])];
  const filters = { ...emptyCatalogFilters(), availableElements: true };
  assert.deepEqual(filterCatalog(cards, "", filters, undefined, new Set(["NORM", "FIRE"])).map(card => card.name), ["Neutral", "Fire", "Spirit", "Elementless"]);
  assert.equal(filterCatalog(cards, "", emptyCatalogFilters(), undefined, new Set(["NORM", "FIRE"])).length, cards.length);
  assert.equal(filterCatalog(cards, "", filters).length, cards.length);
});
