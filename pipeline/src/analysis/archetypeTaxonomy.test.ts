import assert from "node:assert/strict";
import test from "node:test";
import type { CardSignature } from "../cards/catalog.js";
import { isArchetypeStrategyCard } from "./archetypeTaxonomy.js";

function card(types: string[]): CardSignature {
  return {
    name: "Test Card",
    slug: "test-card",
    classes: [],
    types,
    subtypes: [],
    elements: [],
    level: null,
    effect: null,
    editions: [],
  };
}

test("excludes Champion and Spirit identity cards from archetype signatures", () => {
  assert.equal(isArchetypeStrategyCard(card(["CHAMPION"])), false);
  assert.equal(isArchetypeStrategyCard(card(["spirit"])), false);
});

test("retains strategic material cards and unresolved submissions", () => {
  assert.equal(isArchetypeStrategyCard(card(["REGALIA", "ITEM"])), true);
  assert.equal(isArchetypeStrategyCard(undefined), true);
});
