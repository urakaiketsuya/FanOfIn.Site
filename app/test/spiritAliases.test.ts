import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeSpiritCardMap } from "../src/features/deckbuilder/useDeckBuilderPopulation";

test("named Spirit printings collapse into their basic Spirit identity", () => {
  const aliases = new Map([
    ["Aithne, Spirit of Fire", "Spirit of Fire"],
    ["Hanabi, Spirit of Fire", "Spirit of Fire"],
    ["Miao, Spirit of Water", "Spirit of Water"],
  ]);

  assert.deepEqual(
    Array.from(canonicalizeSpiritCardMap([
      ["Aithne, Spirit of Fire", 1],
      ["Hanabi, Spirit of Fire", 1],
      ["Miao, Spirit of Water", 1],
      ["Fragmented Spirit of Fire", 1],
    ], aliases)),
    [
      ["Spirit of Fire", 2],
      ["Spirit of Water", 1],
      ["Fragmented Spirit of Fire", 1],
    ],
  );
});
