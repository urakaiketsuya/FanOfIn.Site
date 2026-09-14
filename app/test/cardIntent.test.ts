import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { extractConsumedSubtypes } from "../src/lib/cardIntent";

const card = (effect: string): Card => ({ name: "Test card", effect, subtypes: [], types: [] } as unknown as Card);
const knownSubtypes = new Set(["harmony", "melody", "animal", "beast"]);

test("Allen's two-clause reveal consumes both Harmony and Melody", () => {
  const consumed = extractConsumedSubtypes(
    card("**On Enter: Glimpse 3**, then reveal the top card of your deck. If that card is a Harmony or Melody card, put it into your hand."),
    knownSubtypes,
  );

  assert.equal(consumed.get("harmony"), "validated");
  assert.equal(consumed.get("melody"), "validated");
});

test("direct reveal lists recognize every eligible subtype", () => {
  const consumed = extractConsumedSubtypes(
    card("You may reveal an Animal or Beast card from among them and put it into your hand."),
    knownSubtypes,
  );

  assert.equal(consumed.get("animal"), "validated");
  assert.equal(consumed.get("beast"), "validated");
});

test("an unrelated subtype later in the effect is not treated as a reveal choice", () => {
  const consumed = extractConsumedSubtypes(
    card("Reveal the top card of your deck. Animal allies you control get +1 power."),
    knownSubtypes,
  );

  assert.equal(consumed.has("animal"), false);
});
