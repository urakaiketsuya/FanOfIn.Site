import assert from "node:assert/strict";
import test from "node:test";
import { computeEngineBalance } from "../src/lib/engineBalance";

const input = { producerCopies: 8, producerRequired: 1, payoffCopies: 4, payoffRequired: 1 };
test("later payoff deadlines improve engine access", () => {
  const result = computeEngineBalance(60, 7, input, 2, 4, "first");
  assert.ok(result.points.at(-1)!.onlineProbability > result.points[0].onlineProbability);
});
test("an earlier producer deadline is stricter", () => {
  const early = computeEngineBalance(60, 7, input, 1, 4, "first");
  const late = computeEngineBalance(60, 7, input, 3, 4, "first");
  assert.ok(early.onlineProbability < late.onlineProbability);
});
test("missing producers strand otherwise accessible payoffs", () => {
  const result = computeEngineBalance(60, 7, { ...input, producerCopies: 0 }, 2, 4, "first");
  assert.equal(result.onlineProbability, 0); assert.ok(result.payoffStrandedProbability > 0);
});
