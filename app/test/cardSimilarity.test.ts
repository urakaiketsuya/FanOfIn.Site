import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { effectRelatedCards } from "../src/lib/cardSimilarity";

const card = (uuid: string, effect: string, subtypes = ["SPELL"]): Card => ({
  uuid,
  name: uuid,
  effect,
  effect_raw: null,
  types: ["ACTION"],
  subtypes,
  editions: [],
} as unknown as Card);

test("effect relationships normalize number words, case, and whitespace", () => {
  const viewed = card("viewed", "Draw two cards, then discard a card.");
  const exact = card("exact", "  draw THREE cards,\nthen discard a card. ");
  const result = effectRelatedCards(viewed, [viewed, exact]);
  assert.deepEqual(result.exact.map((candidate) => candidate.uuid), ["exact"]);
  assert.deepEqual(result.core, []);
});

test("effect relationships expose looser core matches separately", () => {
  const viewed = card("viewed", "Draw two cards, then discard a card.");
  const core = card("core", "Draw 3 cards, then discard a card.\n**Class Bonus:** Deal 2 damage.", ["SPELL", "MAGE"]);
  const result = effectRelatedCards(viewed, [viewed, core]);
  assert.deepEqual(result.exact, []);
  assert.deepEqual(result.core.map((candidate) => candidate.uuid), ["core"]);
});
