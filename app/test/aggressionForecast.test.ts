import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeAggressionForecast } from "../src/lib/aggressionForecast";

const card = (name: string, effect: string, fields: Partial<Card> = {}): Card => ({ name, effect, subtypes: [], types: [], ...fields } as unknown as Card);

test("Full Bloom and Scepter of Awakening forecast 8 to 15 same-turn damage", () => {
  const cards = new Map<string, Card>([
    ["Full Bloom", card("Full Bloom", "Target opponent summons four Flowerbud tokens. Whenever an opponent summons a Flowerbud token, deal 2 damage to each champion that opponent controls.", { types: ["UNIQUE", "PHANTASIA"], cost_reserve: 7 })],
    ["Scepter of Awakening", card("Scepter of Awakening", "Target phantasia becomes an ally with base power and life equal to its reserve cost until end of turn.")],
  ]);
  const forecast = computeAggressionForecast(
    [{ name: "Full Bloom", quantity: 1 }],
    cards,
    [{ name: "Scepter of Awakening", quantity: 1 }, { name: "Diao Chan, Enchantress", quantity: 1 }],
  );

  assert.equal(forecast.awakeningBloomComboCopies, 1);
  assert.equal(forecast.points[0].expectedMin, 0.9);
  assert.equal(forecast.points[0].expectedMax, 1.8);
  assert.equal(forecast.points[0].chanceAtLeastTenMin, 0);
  assert.equal(forecast.points[0].chanceAtLeastTenMax, 0.117);
});

test("Full Bloom does not receive the combo ceiling without both Material pieces", () => {
  const cards = new Map([["Full Bloom", card("Full Bloom", "Whenever an opponent summons a Flowerbud token, deal 2 damage to each champion that opponent controls.")]]);
  const forecast = computeAggressionForecast([{ name: "Full Bloom", quantity: 1 }], cards);
  assert.equal(forecast.awakeningBloomComboCopies, 0);
  assert.ok(forecast.points[0].expectedMax < 1.8);
});

test("Diao reference deck includes Maiden Flowerbuds and the strongest available Scepter target", () => {
  const cards = new Map<string, Card>([
    ["Full Bloom", card("Full Bloom", "Target opponent summons four Flowerbud tokens. Whenever an opponent summons a Flowerbud token, deal 2 damage to each champion that opponent controls.", { types: ["UNIQUE", "PHANTASIA"], cost_reserve: 7 })],
    ["Maiden of Waning Bloom", card("Maiden of Waning Bloom", "Target opponent summons two Flowerbud tokens.", { types: ["PHANTASIA", "ALLY"], cost_reserve: 2, power: 3 })],
    ["Fractal of Rain", card("Fractal of Rain", "Reservable.", { types: ["PHANTASIA"], cost_reserve: 2 })],
    ["Fractal of Snow", card("Fractal of Snow", "Reservable.", { types: ["PHANTASIA"], cost_reserve: 2 })],
    ["Fractal of Waves", card("Fractal of Waves", "Reservable.", { types: ["PHANTASIA"], cost_reserve: 3 })],
    ["Hydrating Fractal", card("Hydrating Fractal", "Reservable.", { types: ["PHANTASIA"], cost_reserve: 1 })],
  ]);
  const forecast = computeAggressionForecast([
    { name: "Full Bloom", quantity: 4 },
    { name: "Maiden of Waning Bloom", quantity: 4 },
    { name: "Fractal of Rain", quantity: 3 },
    { name: "Fractal of Snow", quantity: 3 },
    { name: "Fractal of Waves", quantity: 4 },
    { name: "Hydrating Fractal", quantity: 4 },
  ], cards, [{ name: "Scepter of Awakening", quantity: 1 }, { name: "Diao Chan, Enchantress", quantity: 1 }]);
  const bloomOnly = computeAggressionForecast(
    [{ name: "Full Bloom", quantity: 4 }],
    cards,
    [{ name: "Scepter of Awakening", quantity: 1 }, { name: "Diao Chan, Enchantress", quantity: 1 }],
  );

  assert.equal(forecast.awakeningBloomComboCopies, 22);
  assert.ok(forecast.points[0].expectedMax > bloomOnly.points[0].expectedMax);
  assert.ok(forecast.points[0].expectedMin < forecast.points[0].expectedMax);
  assert.ok(forecast.points[0].chanceAtLeastTenMax > 0.35);
});
