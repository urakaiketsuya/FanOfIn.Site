import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { matchesComboRequirement, printedKeywords } from "../src/lib/comboRequirements";

function card(overrides: Partial<Card>): Card {
  return { name: "Test", types: [], subtypes: [], effect: null, ...overrides } as Card;
}

test("type and subtype requirements match deck cards case-insensitively", () => {
  const fractal = card({ name: "Fractal of Sparks", types: ["ALLY"], subtypes: ["FRACTAL"] });
  assert.equal(matchesComboRequirement(fractal, { kind: "attribute", value: "subtype:FRACTAL", cards: [] }), true);
  assert.equal(matchesComboRequirement(fractal, { kind: "attribute", value: "type:ACTION", cards: [] }), false);
});

test("printed keywords ignore numeric parameters", () => {
  const glimpse = card({ effect: "**Glimpse 3**, then draw a card. **Floating Memory**" });
  assert.deepEqual(printedKeywords(glimpse), ["Glimpse", "Floating Memory"]);
  assert.equal(matchesComboRequirement(glimpse, { kind: "keyword", value: "glimpse", cards: [] }), true);
});

test("printed keywords collapse casing variants and omit formatted costs", () => {
  const reservable = card({ effect: "**Reservable**. **reservable**. **(3), [REST], Sacrifice CARDNAME**: Draw a card." });
  assert.deepEqual(printedKeywords(reservable), ["Reservable"]);
});

test("specific-card requirements can contain multiple alternatives", () => {
  const target = card({ name: "Second option" });
  assert.equal(matchesComboRequirement(target, { kind: "cards", value: "", cards: ["First option", "Second option"] }), true);
});
