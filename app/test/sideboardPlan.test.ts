import assert from "node:assert/strict";
import test from "node:test";
import { buildSideboardPlan, parseSavedSideboardPlans, sideboardPlanDeckFingerprint } from "../src/lib/sideboardPlan";

const main = [{ name: "Alpha", quantity: 4 }, { name: "Beta", quantity: 2 }];
const sideboard = [{ name: "Gamma", quantity: 3 }, { name: "Alpha", quantity: 1 }];

test("applies a balanced multi-card plan without changing deck size", () => {
  const result = buildSideboardPlan(main, sideboard, { Alpha: 2, Beta: 1 }, { Gamma: 2, Alpha: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.cardsOut, 3);
  assert.deepEqual(result.postboardMain, [{ name: "Alpha", quantity: 3 }, { name: "Beta", quantity: 1 }, { name: "Gamma", quantity: 2 }]);
  assert.equal(result.postboardMain.reduce((sum, line) => sum + line.quantity, 0), 6);
});

test("rejects an unbalanced plan", () => {
  const result = buildSideboardPlan(main, sideboard, { Alpha: 2 }, { Gamma: 1 });
  assert.equal(result.valid, false);
  assert.equal(result.balanced, false);
  assert.match(result.errors[0] ?? "", /same number/);
});

test("rejects quantities beyond registered copies", () => {
  const result = buildSideboardPlan(main, sideboard, { Beta: 3 }, { Gamma: 3 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Cannot remove 3 copies of Beta."));
});

test("deck fingerprints ignore line order but include the sideboard", () => {
  const first = sideboardPlanDeckFingerprint("Lorraine", main, sideboard);
  const reordered = sideboardPlanDeckFingerprint("Lorraine", [...main].reverse(), [...sideboard].reverse());
  const changed = sideboardPlanDeckFingerprint("Lorraine", main, [{ name: "Gamma", quantity: 2 }]);
  assert.equal(first, reordered);
  assert.notEqual(first, changed);
});

test("saved plan parsing rejects malformed local data", () => {
  const valid = { id: "1", name: "Control", matchup: "Alice", createdAt: "2026-01-01", updatedAt: "2026-01-01", outs: { Alpha: 2 }, ins: { Gamma: 2 } };
  assert.deepEqual(parseSavedSideboardPlans(JSON.stringify([valid, { name: "broken" }])), [valid]);
  assert.deepEqual(parseSavedSideboardPlans("not json"), []);
});
