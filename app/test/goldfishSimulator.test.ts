import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { resolveGlimpse, suggestedGlimpse, type GoldfishState } from "../src/lib/goldfishSimulator";

const card = (effect: string): Card => ({ effect } as Card);

test("glimpse keeps selected cards on top and moves the rest below the unseen library", () => {
  const state: GoldfishState = {
    library: ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() })),
    hand: [],
    played: [],
  };
  const result = resolveGlimpse(state, 3, new Set(["a", "c"]));
  assert.deepEqual(result.library.slice(0, 4).map(({ id }) => id), ["a", "c", "d", "e"]);
  assert.equal(result.library.at(-1)?.id, "b");
  assert.deepEqual(state.library.map(({ id }) => id), ["a", "b", "c", "d", "e"]);
});

test("glimpse suggestion recognizes fixed amounts and skips variable additions", () => {
  assert.equal(suggestedGlimpse(card("Glimpse 3. Then draw a card.")), 3);
  assert.equal(suggestedGlimpse(card("Glimpse 2, then Glimpse 4.")), 6);
  assert.equal(suggestedGlimpse(card("Glimpse 1+X.")), 0);
  assert.equal(suggestedGlimpse(card("Glimpse LV.")), 0);
});
