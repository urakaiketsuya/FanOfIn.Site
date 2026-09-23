import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { extractConsumedSubtypes, extractProducedTokens, intentCards } from "../src/lib/cardIntent";

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

test("token producers accept lowercase keywords and flexible quantities", () => {
  assert.deepEqual([...extractProducedTokens(card("**summon** any number of Powercell tokens."))], ["powercell"]);
  assert.deepEqual([...extractProducedTokens(card("**Summon** that many Core Fractal tokens rested."))], ["core fractal"]);
});

test("intent matching tolerates absent reference arrays", () => {
  const producer = { ...card("**summon** a Powercell token."), uuid: "producer", slug: "producer", name: "Producer", references: null, referenced_by: null } as unknown as Card;
  const consumer = { ...card("As an additional cost, sacrifice a Powercell."), uuid: "consumer", slug: "consumer", name: "Consumer", references: null, referenced_by: null } as unknown as Card;
  const result = intentCards(producer, [producer, consumer]);
  assert.equal(result.feeds.some((match) => match.card.name === "Consumer" && match.via === "powercell"), true);
});
