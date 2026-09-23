import assert from "node:assert/strict";
import test from "node:test";
import { computeStageDrawQuality } from "../src/lib/stageDrawQuality";

const input = { earlyCopies: 12, lateCopies: 8, flexibleCopies: 8, conditionalCopies: 4 };
test("staged plan is no more likely than either component", () => {
  const result = computeStageDrawQuality(60, 7, input, 2, 6, "first", 1);
  assert.ok(result.stagedPlan <= result.openingFunctional); assert.ok(result.stagedPlan <= result.lateInjection);
});
test("allowing more opening clunk improves opening quality", () => {
  const strict = computeStageDrawQuality(60, 7, input, 2, 6, "first", 0);
  const loose = computeStageDrawQuality(60, 7, input, 2, 6, "first", 2);
  assert.ok(loose.openingFunctional > strict.openingFunctional);
});
test("a longer late window improves late injection", () => {
  const short = computeStageDrawQuality(60, 7, input, 2, 3, "first", 1);
  const long = computeStageDrawQuality(60, 7, input, 2, 7, "first", 1);
  assert.ok(long.lateInjection > short.lateInjection);
});
