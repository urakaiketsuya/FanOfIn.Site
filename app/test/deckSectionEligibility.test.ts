import test from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { deckDestinationEligibility } from "../src/lib/deckSectionEligibility";

const card = (types: string[]) => ({ types }) as Card;

test("Champion and Regalia cards can move to Material, Sideboard, or Maybeboard but not Main", () => {
  for (const materialCard of [card(["CHAMPION"]), card(["REGALIA", "ITEM"])]) {
    assert.equal(deckDestinationEligibility(materialCard, "main").allowed, false);
    assert.match(deckDestinationEligibility(materialCard, "main").reason ?? "", /Material Deck/);
    assert.equal(deckDestinationEligibility(materialCard, "material").allowed, true);
    assert.equal(deckDestinationEligibility(materialCard, "sideboard").allowed, true);
    assert.equal(deckDestinationEligibility(materialCard, "maybeboard").allowed, true);
  }
});

test("Main-deck card types cannot move to Material", () => {
  const action = card(["ACTION"]);
  assert.equal(deckDestinationEligibility(action, "main").allowed, true);
  assert.equal(deckDestinationEligibility(action, "material").allowed, false);
  assert.match(deckDestinationEligibility(action, "material").reason ?? "", /Champion and Regalia/);
});

test("unknown catalog cards remain movable for incomplete imports", () => {
  for (const destination of ["main", "material", "sideboard", "maybeboard"] as const) {
    assert.equal(deckDestinationEligibility(undefined, destination).allowed, true);
  }
});
