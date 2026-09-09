import assert from "node:assert/strict";
import test from "node:test";
import type { OmnidexDecklist } from "@gatcg/shared";
import { applyDeckQuantityChanges, chanceAtLeastOne } from "../src/lib/deckChangePreview";

const decklist: OmnidexDecklist = {
  main: [{ card: "Alpha", quantity: 4 }, { card: "Beta", quantity: 2 }],
  material: [{ card: "Champion", quantity: 1 }],
  sideboard: [{ card: "Tech", quantity: 3 }],
};

test("deck change previews apply cuts and additions without mutating the saved deck", () => {
  const projected = applyDeckQuantityChanges(decklist, [
    { cardName: "Alpha", section: "main", delta: -2 },
    { cardName: "Beta", section: "main", delta: -2 },
    { cardName: "New Tech", section: "sideboard", delta: 1 },
  ]);
  assert.deepEqual(projected.main, [{ card: "Alpha", quantity: 2 }]);
  assert.deepEqual(projected.sideboard, [{ card: "Tech", quantity: 3 }, { card: "New Tech", quantity: 1 }]);
  assert.equal(decklist.main[0].quantity, 4);
  assert.equal(decklist.main.length, 2);
});

test("changed-card exposure uses an exact draw probability without replacement", () => {
  assert.ok(Math.abs(chanceAtLeastOne(60, 4, 10) - 0.5277201537) < 0.000001);
  assert.equal(chanceAtLeastOne(60, 0, 10), 0);
  assert.equal(chanceAtLeastOne(60, 60, 7), 1);
});
