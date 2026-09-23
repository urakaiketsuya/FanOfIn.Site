import assert from "node:assert/strict";
import test from "node:test";
import { computeFunctionalHand, computeHandRecipe } from "../src/lib/functionalHand";

const roles = [
  { role: "proactive" as const, copies: 12 }, { role: "setup" as const, copies: 8 },
  { role: "interaction" as const, copies: 8 }, { role: "liability" as const, copies: 6 },
];
const required = ["proactive", "setup", "interaction"] as const;

test("functional hand odds improve with additional draws", () => {
  const result = computeFunctionalHand(60, 7, roles, [...required], 1, 3, "first");
  assert.ok(result.points[7].probability > result.openingProbability);
});
test("a stricter liability cap lowers functional-hand odds", () => {
  const strict = computeFunctionalHand(60, 7, roles, [...required], 0, 3, "first");
  const loose = computeFunctionalHand(60, 7, roles, [...required], 2, 3, "first");
  assert.ok(strict.targetProbability < loose.targetProbability);
});
test("a missing required role makes a functional hand impossible", () => {
  const result = computeFunctionalHand(60, 7, roles.map((role) => role.role === "interaction" ? { ...role, copies: 0 } : role), [...required], 1, 3, "first");
  assert.equal(result.targetProbability, 0);
});

test("a named recipe treats cards within one requirement as exact alternatives", () => {
  const combined = computeHandRecipe(60, 7, [{ id: "action", label: "Early action", copies: 8, minimum: 1 }, { id: "setup", label: "Setup", copies: 6, minimum: 1 }], 0, 1, 1, "first");
  const legacy = computeFunctionalHand(60, 7, [{ role: "proactive", copies: 8 }, { role: "setup", copies: 6 }], ["proactive", "setup"], 1, 1, "first");
  assert.equal(combined.openingProbability, legacy.openingProbability);
});

test("named recipes support multiple required copies and a capped avoid-early pool", () => {
  const permissive = computeHandRecipe(60, 7, [{ id: "setup", label: "Setup", copies: 10, minimum: 2 }], 8, 2, 3, "first");
  const strict = computeHandRecipe(60, 7, [{ id: "setup", label: "Setup", copies: 10, minimum: 2 }], 8, 0, 3, "first");
  assert.ok(permissive.targetProbability > strict.targetProbability);
  assert.equal(permissive.bottleneck?.label, "Setup");
});
