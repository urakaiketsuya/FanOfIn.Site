import assert from "node:assert/strict";
import test from "node:test";
import { computeDeckRating, type DiaoCard } from "@gatcg/shared";
import { computeDiaoV1Rating, scoreDiaoV1Points } from "./diaoV1Legacy.js";

test("frozen v1 retains the legacy threat contribution to durability", () => {
  const cards = new Map<string, DiaoCard>([["Threat", { name: "Threat", classes: [], types: ["ALLY"], effect: "", cost_memory: 2, power: 3 }]]);
  const lines = [{ name: "Threat", quantity: 4 }];
  assert.equal(computeDiaoV1Rating(lines, cards, null, []).points.durability, 1.2);
  assert.equal(computeDeckRating(lines, cards, null, []).points.durability, 0);
});

test("migration decomposition can score v2 evidence on frozen v1 bands", () => {
  assert.deepEqual(scoreDiaoV1Points({ durability: 0, interaction: 0, aggro: 0, opportunity: 0 }), {
    durability: 3,
    interaction: 3,
    aggro: 3,
    opportunity: 3,
  });
});
