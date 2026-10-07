import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeLevelGoalAnalysis } from "../src/lib/levelGoal";

const card = (name: string, overrides: Partial<Card>): Card => ({ name, types: [], subtypes: [], effect: null, cost_reserve: null, ...overrides } as Card);
const catalog = new Map<string, Card>([
  ["Dungeon Guide", card("Dungeon Guide", { types: ["ALLY"], cost_reserve: 3, effect: "On Enter: banish two cards at random from your memory. If you do, level up your champion." })],
  ["Lacunarity Guide", card("Lacunarity Guide", { types: ["ALLY"], cost_reserve: 3, effect: "You may sacrifice two Fractal phantasias rather than pay the memory cost of champion cards you materialize." })],
  ["Fractal A", card("Fractal A", { types: ["PHANTASIA"], subtypes: ["FRACTAL"], cost_reserve: 2, effect: "Reservable" })],
  ["Level zero", card("Level zero", { types: ["CHAMPION"], level: 0, effect: "On Enter: Draw seven cards." })],
  ["Fragmented Spirit", card("Fragmented Spirit", { types: ["CHAMPION"], subtypes: ["SPIRIT"], level: 0, effect: "On Enter: Glimpse 6. Draw six cards. Then summon a Spirit Shard token." })],
]);
const material = [{ name: "Level zero", quantity: 1 }];

test("direct level-up is recognized as the route that can beat the natural level-three schedule", () => {
  const result = computeLevelGoalAnalysis([{ name: "Dungeon Guide", quantity: 2 }], material, catalog, { targetLevel: 3, targetTurn: 2, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true });
  assert.ok((result.routes.find((route) => route.id === "direct")?.probability ?? 0) > 0);
  assert.equal(result.routes.find((route) => route.id === "fractal")?.status, "blocked");
});

test("Fragmented Spirit selection expands enabler access without expanding resource capacity", () => {
  const main = [{ name: "Dungeon Guide", quantity: 2 }];
  const shallow = computeLevelGoalAnalysis(main, [{ name: "Fragmented Spirit", quantity: 1 }], catalog, { targetLevel: 3, targetTurn: 3, playOrder: "first", useDirectLevelUp: true, useFractalPayment: false, fragmentedSpiritDepth: 6 });
  const deep = computeLevelGoalAnalysis(main, [{ name: "Fragmented Spirit", quantity: 1 }], catalog, { targetLevel: 3, targetTurn: 3, playOrder: "first", useDirectLevelUp: true, useFractalPayment: false, fragmentedSpiritDepth: 12 });
  assert.ok((deep.routes.find((route) => route.id === "direct")?.probability ?? 0) > (shallow.routes.find((route) => route.id === "direct")?.probability ?? 0));
  assert.match(deep.routes.find((route) => route.id === "direct")?.bottleneck ?? "", /14 inspected cards/);
});

test("goal suggestions name eligible cards below four copies and omit four-copy cards", () => {
  const result = computeLevelGoalAnalysis([{ name: "Dungeon Guide", quantity: 3 }, { name: "Lacunarity Guide", quantity: 4 }, { name: "Fractal A", quantity: 4 }], material, catalog, { targetLevel: 3, targetTurn: 2, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true });
  assert.deepEqual(result.suggestions.map((suggestion) => suggestion.cardName), ["Dungeon Guide"]);
});

test("level three needs two accelerants on turn two and becomes natural on turn four", () => {
  const main = [{ name: "Dungeon Guide", quantity: 1 }];
  const config = { targetLevel: 3, targetTurn: 2, playOrder: "first" as const, useDirectLevelUp: true, useFractalPayment: true };
  const early = computeLevelGoalAnalysis(main, material, catalog, config);
  assert.equal(early.naturalTurn, 4);
  assert.equal(early.routes.find((route) => route.id === "natural")?.probability, 0);
  assert.equal(early.routes.find((route) => route.id === "direct")?.probability, 0);
  const third = computeLevelGoalAnalysis(main, material, catalog, { ...config, targetTurn: 3 });
  assert.equal(third.routes.find((route) => route.id === "natural")?.probability, 0);
  assert.ok((third.routes.find((route) => route.id === "direct")?.probability ?? 0) > 0);
  const fourth = computeLevelGoalAnalysis(main, material, catalog, { ...config, targetTurn: 4 });
  assert.equal(fourth.routes.find((route) => route.id === "natural")?.probability, 1);
  assert.equal(fourth.routes.find((route) => route.id === "direct")?.status, "not-needed");
});
