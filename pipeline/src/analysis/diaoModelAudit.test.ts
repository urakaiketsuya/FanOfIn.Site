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
});
