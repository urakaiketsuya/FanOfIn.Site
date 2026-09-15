import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { inferComboPurpose } from "../src/lib/comboPurpose";

const card = (name: string, effect: string, subtypes: string[] = []): Card => ({ name, effect, subtypes, types: ["ACTION"], elements: [], classes: [], level: null, cost_memory: null, cost_reserve: 0, power: null, life: null, durability: null, speed: null, legality: {} }) as Card;
const cards = new Map([
  ["Dungeon Guide", card("Dungeon Guide", "On Enter: Level up your champion. Sacrifice two Fractal phantasias rather than pay the memory cost.")],
  ["Little Fractal", card("Little Fractal", "Reservable", ["FRACTAL"])],
  ["Insight", card("Insight", "Draw two cards.")],
]);
const main = [...cards.keys()].map((name) => ({ name }));

test("infers leveling and payment from chosen alternatives", () => {
  const result = inferComboPurpose([{ kind: "cards", cards: ["Dungeon Guide"], value: "", required: 1 }, { kind: "attribute", cards: [], value: "subtype:FRACTAL", required: 2 }], main, cards);
  assert.equal(result.goalId, "level");
  assert.deepEqual(result.purposes.map((purpose) => purpose.id), ["level", "payment"]);
});

test("infers draw from the selected card's printed effect", () => {
  assert.equal(inferComboPurpose([{ kind: "cards", cards: ["Insight"], value: "", required: 1 }], main, cards).goalId, "draw");
});
