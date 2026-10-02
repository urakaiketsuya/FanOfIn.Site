import assert from "node:assert/strict";
import test from "node:test";
import { sortCatalogNames } from "../src/components/deck-editor/catalogFilters";

test("recommendation order preserves ranked and ownership-prioritized input without mutating it", () => {
  const names = ["Zephyr", "Abnegation", "Dungeon Guide"];
  const result = sortCatalogNames(names, new Map(), "recommended");
  assert.deepEqual(result, names);
  assert.notEqual(result, names);
  assert.deepEqual(sortCatalogNames(names, new Map(), "name"), ["Abnegation", "Dungeon Guide", "Zephyr"]);
  assert.deepEqual(names, ["Zephyr", "Abnegation", "Dungeon Guide"]);
});
