import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCardCost, parseCostModifierRules, type Card } from "@gatcg/shared";

const card = (name: string, effect: string, cost = 4) => ({ name, effect, cost_reserve: cost } as Card);

test("catalog wording: fixed class bonus exposes condition and applies only when selected", () => {
  const rules = parseCostModifierRules(card("Acquiescing Rejection", "[Class Bonus] This card costs 1 less to activate.", 4));
  assert.equal(rules[0].amount.kind, "fixed");
  assert.equal(rules[0].condition.kind, "class-bonus");
  assert.equal(evaluateCardCost(4, rules).effectiveCost, 4);
  assert.equal(evaluateCardCost(4, rules, { classBonus: true }).effectiveCost, 3);
});

test("catalog wording: Efficiency uses champion level and never reduces below zero", () => {
  const rules = parseCostModifierRules(card("Arcane Blast", "Efficiency (This card costs LV less to activate. LV refers to your champion's level.)", 11));
  assert.equal(evaluateCardCost(11, rules, { championLevel: 3 }).effectiveCost, 8);
  assert.equal(evaluateCardCost(11, rules, { championLevel: 20 }).effectiveCost, 0);
});

test("catalog wording: per-object reducers are explicit unsupported variables until supplied", () => {
  const rules = parseCostModifierRules(card("Blade of Creation", "[Class Bonus] This card costs 1 less to activate for each token object you control.", 7));
  assert.equal(rules[0].amount.kind, "variable");
  assert.equal(rules[0].supported, false);
  assert.equal(evaluateCardCost(7, rules, { classBonus: true }).effectiveCost, 7);
  assert.equal(evaluateCardCost(7, rules, { enabledConditions: [rules[0].id], variableAmounts: { [rules[0].id]: 3 } }).effectiveCost, 4);
});

test("catalog wording: activated abilities and next-card reducers are not card Reserve reductions", () => {
  const ability = parseCostModifierRules(card("Aella, Zephyr's Hand", "This ability costs (3) less to activate the first time you activate it.", 3));
  const next = parseCostModifierRules(card("Channeling Stone", "Banish CARDNAME: The next card you activate this turn costs 2 less to activate.", 0));
  assert.equal(ability[0].costKind, "activated-ability");
  assert.equal(ability[0].usageLimit, "first-activation");
  assert.equal(next[0].costKind, "next-activation");
  assert.equal(evaluateCardCost(3, ability, { enabledConditions: [ability[0].id] }).effectiveCost, 3);
});

test("multiple fixed reductions stack additively with a floor of zero", () => {
  const rules = [
    ...parseCostModifierRules(card("Castling", "This card costs 2 less to activate if you control a Chessman Rook ally. This card costs 2 less to activate if you control a Chessman King ally.", 4)),
  ];
  assert.equal(evaluateCardCost(4, rules, { enabledConditions: rules.map((rule) => rule.id) }).effectiveCost, 0);
});
