import assert from "node:assert/strict";
import test from "node:test";
import { computeGamePlanReadiness, computeGamePlanViews } from "../src/lib/gamePlanReadiness";

const roles = [
  { role: "enabler" as const, copies: 8, required: 1 },
  { role: "payoff" as const, copies: 4, required: 1 },
  { role: "protection" as const, copies: 4, required: 1 },
];

test("game plan readiness improves as more cards are seen", () => {
  const result = computeGamePlanReadiness(60, 7, roles, 3, "first");
  assert.ok(result.points[7].coreProbability > result.points[0].coreProbability);
});
test("protection is stricter than the core plan", () => {
  const result = computeGamePlanReadiness(60, 7, roles, 3, "first");
  assert.ok(result.targetProtectedProbability != null && result.targetProtectedProbability < result.targetCoreProbability);
});
test("going second improves same-turn access", () => {
  const first = computeGamePlanReadiness(60, 7, roles, 3, "first");
  const second = computeGamePlanReadiness(60, 7, roles, 3, "second");
  assert.ok(second.targetCoreProbability > first.targetCoreProbability);
});
test("a missing required role keeps the plan offline", () => {
  const result = computeGamePlanReadiness(60, 7, roles.map((role) => role.role === "payoff" ? { ...role, copies: 0 } : role), 3, "first");
  assert.equal(result.targetCoreProbability, 0); assert.equal(result.expectedCoreCardsSeen, null);
});

test("consolidated views reuse the same disjoint role counts", () => {
  const result = computeGamePlanViews(60, 7, roles, 2, 4, "first", 1);
  assert.equal(result.readiness.targetCoreProbability, computeGamePlanReadiness(60, 7, roles, 4, "first").targetCoreProbability);
  assert.ok(result.timing.onlineProbability <= result.readiness.targetCoreProbability);
  assert.ok(result.stages.stagedPlan <= result.stages.openingFunctional);
});
