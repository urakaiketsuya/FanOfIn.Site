import assert from "node:assert/strict";
import test from "node:test";
import { computeDeckRating, scoreDiaoPoints, type DiaoCard } from "@gatcg/shared";

function card(name: string, overrides: Partial<DiaoCard> = {}): DiaoCard {
  return { name, classes: [], types: ["ACTION"], effect: null, cost_memory: 1, power: null, ...overrides };
}

test("DIAO point mutations move their intended pillars", () => {
  const cards = new Map<string, DiaoCard>([
    ["Baseline", card("Baseline")],
    ["Aggro", card("Aggro", { types: ["ALLY"], power: 4 })],
    ["Interaction", card("Interaction", { effect: "Fast activation. **Negate** target card activation." })],
    ["Opportunity", card("Opportunity", { effect: "At the beginning of your recollection phase, draw a card." })],
    ["Durability", card("Durability", { effect: "**Recover 4**. Prevent the next 1 damage." })],
  ]);
  const baseline = computeDeckRating([{ name: "Baseline", quantity: 4 }], cards, null, []);
  for (const pillar of ["aggro", "interaction", "opportunity", "durability"] as const) {
    const next = computeDeckRating([{ name: "Baseline", quantity: 4 }, { name: pillar[0].toUpperCase() + pillar.slice(1), quantity: 1 }], cards, null, []);
    assert.ok(next.points[pillar] > baseline.points[pillar], `${pillar} should increase`);
  }
});

test("DIAO score bands retain the documented 3-to-10 mapping", () => {
  assert.deepEqual(scoreDiaoPoints({ durability: 0, interaction: 0, aggro: 0, opportunity: 0 }), { durability: 3, interaction: 3, aggro: 3, opportunity: 3 });
  assert.deepEqual(scoreDiaoPoints({ durability: 100, interaction: 100, aggro: 100, opportunity: 100 }), { durability: 10, interaction: 10, aggro: 10, opportunity: 10 });
  assert.equal(scoreDiaoPoints({ durability: 0, interaction: 100, aggro: 100, opportunity: 100 }).durability, 3);
});

test("DIAO classifies fixed and variable Recover separately", () => {
  const cards = new Map<string, DiaoCard>([
    ["Fixed", card("Fixed", { effect: "**Recover 4**." })],
    ["Base plus X", card("Base plus X", { effect: "**Recover 8+X**." })],
    ["Only X", card("Only X", { effect: "**Recover X**." })],
  ]);
  const rating = computeDeckRating(Array.from(cards.keys(), (name) => ({ name, quantity: 1 })), cards, null, []);
  assert.equal(rating.signals.recover, 4);
  assert.equal(rating.signals.variableRecover, 2);
});

test("DIAO recognizes draw variants without counting Spirit opening hands", () => {
  const cards = new Map<string, DiaoCard>([
    ["Spirit", card("Spirit", { types: ["CHAMPION"], subtypes: ["SPIRIT"], effect: "**On Enter:** Draw seven cards." })],
    ["Fixed", card("Fixed", { effect: "Draw seven cards." })],
    ["Variable", card("Variable", { effect: "Draw X cards." })],
    ["Repeatable", card("Repeatable", { effect: "At the beginning of your turn, draw a card." })],
  ]);
  const rating = computeDeckRating(Array.from(cards.keys(), (name) => ({ name, quantity: 1 })), cards, null, []);
  assert.equal(rating.signals.oneShotDraw, 2);
  assert.equal(rating.signals.variableDraw, 1);
  assert.equal(rating.signals.repeatableDraw, 1);
});

test("DIAO catches embedded Negate actions without counting negation references", () => {
  const cards = new Map<string, DiaoCard>([
    ["Action", card("Action", { effect: "**On Sacrifice: Negate** target card activation unless its controller pays (2)." })],
    ["Reference", card("Reference", { effect: "This card's activation can't be **negated**." })],
  ]);
  const rating = computeDeckRating(Array.from(cards.keys(), (name) => ({ name, quantity: 1 })), cards, null, []);
  assert.equal(rating.signals.negate, 1);
});

test("Durability no longer rewards generic Ally threat density", () => {
  const cards = new Map<string, DiaoCard>([["Threat", card("Threat", { types: ["ALLY"], power: 4 })]]);
  const rating = computeDeckRating([{ name: "Threat", quantity: 4 }], cards, null, []);
  assert.equal(rating.signals.threats, 4);
  assert.equal(rating.points.durability, 0);
});
