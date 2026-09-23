import assert from "node:assert/strict";
import test from "node:test";
import { computeResilienceForecast } from "../src/lib/resilienceForecast";

const input = { establishCopies: 12, establishRequired: 2, protectionCopies: 4, protectionRequired: 1, rebuildCopies: 4, rebuildRequired: 1 };
test("either protection or rebuild improves on protection alone", () => {
  const result = computeResilienceForecast(60, 7, input, 3, 5, "first");
  assert.ok(result.resilientProbability > result.protectedProbability);
});
test("resilience cannot exceed establishing the plan", () => {
  const result = computeResilienceForecast(60, 7, input, 3, 5, "first");
  assert.ok(result.resilientProbability <= result.establishProbability);
});
test("a later recovery deadline improves rebuild access", () => {
  const early = computeResilienceForecast(60, 7, input, 3, 3, "first");
  const late = computeResilienceForecast(60, 7, input, 3, 6, "first");
  assert.ok(late.rebuildProbability > early.rebuildProbability);
});
