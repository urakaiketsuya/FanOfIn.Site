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
