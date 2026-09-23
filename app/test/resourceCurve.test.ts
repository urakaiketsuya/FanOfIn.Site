import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeResourceCurveReliability } from "../src/features/deckbuilder/resourceCurve";

const card = (name: string, reserve: number) => ({ name, cost: { type: "reserve", amount: reserve }, cost_reserve: reserve }) as unknown as Card;

test("resource timing groups cards by entered effective cost", () => {
  const cards = new Map<string, Card>([["Discounted", card("Discounted", 5)], ["Natural", card("Natural", 3)]]);
  const result = computeResourceCurveReliability([{ name: "Discounted", quantity: 4 }, { name: "Natural", quantity: 4 }], cards, 7, { Discounted: 3 });
  assert.deepEqual(result.map((point) => [point.cost, point.copies]), [[3, 8]]);
});

test("resource timing clamps invalid negative effective costs", () => {
  const cards = new Map<string, Card>([["Discounted", card("Discounted", 5)]]);
  const result = computeResourceCurveReliability([{ name: "Discounted", quantity: 4 }], cards, 7, { Discounted: -2 });
  assert.equal(result[0].cost, 0);
});
