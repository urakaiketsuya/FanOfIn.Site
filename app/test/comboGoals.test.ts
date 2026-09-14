import assert from "node:assert/strict";
import test from "node:test";
import { COMBO_GOALS, comboGoal } from "../src/lib/comboGoals";

test("Champion leveling remains the default Combo Lab goal", () => {
  assert.equal(COMBO_GOALS[0].id, "level");
  assert.equal(comboGoal("level").evidence, "rules-exact");
});

test("every goal declares rules provenance and a calculation boundary", () => {
  assert.ok(COMBO_GOALS.length > 1);
  for (const goal of COMBO_GOALS) {
    assert.ok(goal.ruleLinks.length > 0, `${goal.id} needs a rules source`);
    assert.ok(goal.ruleLinks.every((link) => link.href.startsWith("https://rules.gatcg.com/")));
    assert.ok(goal.measures.length > 0);
    assert.ok(goal.doesNotMeasure.length > 0);
  }
});
