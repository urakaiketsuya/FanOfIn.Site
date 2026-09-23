import assert from "node:assert/strict";
import test from "node:test";
import { buildSideboardPlan } from "../src/lib/sideboardPlan";

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
