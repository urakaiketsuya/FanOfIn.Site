import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeReserveSequence } from "../src/features/deckbuilder/reserveSequence";

const discountedAlly = { name: "Discounted Ally", types: ["ALLY"], cost_reserve: 4, effect: "This card costs 3 less to activate." } as Card;

test("effective Reserve cost includes a satisfied activation discount", () => {
  const cards = new Map([[discountedAlly.name, discountedAlly]]);
  const deck = [{ name: discountedAlly.name, quantity: 4 }];
  const printed = computeReserveSequence(deck, cards, [{ name: discountedAlly.name, turn: 1 }], 3);
  const discounted = computeReserveSequence(deck, cards, [{ name: discountedAlly.name, turn: 1, effectiveReserveCost: 1 }], 3);
  assert.equal(printed.feasible, false);
  assert.equal(discounted.feasible, true);
  assert.equal(discounted.pressure[0].reserveCost, 1);
});
