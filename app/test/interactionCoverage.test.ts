import assert from "node:assert/strict";
import test from "node:test";
import { computeInteractionCoverage } from "../src/lib/interactionCoverage";

test("sideboard answers improve interaction access", () => {
  const result = computeInteractionCoverage(60, 7, 3, "first", 4, 3);
  assert.ok(result.postboardProbability > result.preboardProbability);
  assert.equal(result.postboardCopies, 7);
});
test("later critical turns see more answers", () => {
  const early = computeInteractionCoverage(60, 7, 2, "first", 4, 0);
  const late = computeInteractionCoverage(60, 7, 6, "first", 4, 0);
  assert.ok(late.preboardProbability > early.preboardProbability);
});
