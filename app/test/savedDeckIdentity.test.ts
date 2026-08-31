import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeSavedDecklist, savedDeckIdentityInput } from "@gatcg/shared";

test("saved deck identity ignores ordering, casing, whitespace, and sideboard", () => {
  const first = { main: [{ card: "Dungeon Guide", quantity: 2 }, { card: " dungeon   guide ", quantity: 2 }], material: [{ card: "Spirit of Water", quantity: 1 }], sideboard: [{ card: "Card A", quantity: 2 }] };
  const second = { main: [{ card: "DUNGEON GUIDE", quantity: 4 }], material: [{ card: "Spirit of Water", quantity: 1 }], sideboard: [{ card: "Card B", quantity: 3 }] };
  assert.equal(savedDeckIdentityInput(first), savedDeckIdentityInput(second));
});

test("canonical saved deck keeps a normalized sideboard", () => {
  const deck = canonicalizeSavedDecklist({ main: [], material: [], sideboard: [{ card: " Test Card ", quantity: 1 }, { card: "test card", quantity: 2 }] });
  assert.deepEqual(deck.sideboard, [{ card: "Test Card", quantity: 3 }]);
});
