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
  assert.equal(forecast.points[0].expectedMin, 0);
  assert.equal(forecast.points[0].expectedMax, 0);
  assert.equal(forecast.points[0].chanceAtLeastTenMin, 0);
  assert.equal(forecast.points[0].chanceAtLeastTenMax, 0);
  assert.equal(forecast.points[1].expectedMin, 1.3);
  assert.equal(forecast.points[1].expectedMax, 2.5);
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
  assert.ok(forecast.points[1].expectedMax > bloomOnly.points[1].expectedMax);
  assert.ok(forecast.points[1].expectedMin < forecast.points[1].expectedMax);
  assert.ok(forecast.points[2].chanceAtLeastTenMax > 0.35);
  assert.match(forecast.audit.find((entry) => entry.name === "Full Bloom")?.reason ?? "", /Flowerbud/);
  assert.match(forecast.audit.find((entry) => entry.name === "Fractal of Waves")?.reason ?? "", /Scepter/);
  assert.match(forecast.audit.find((entry) => entry.name === "Maiden of Waning Bloom")?.reason ?? "", /Flowerbuds/);
});

test("damage coverage audit flags unresolved damage text instead of silently dropping it", () => {
  const unknownPattern = card("Unclassified Blast", "Whenever this awakens, damage dealt this way is doubled.");
  const forecast = computeAggressionForecast([{ name: unknownPattern.name, quantity: 2 }], new Map([[unknownPattern.name, unknownPattern]]));
  assert.deepEqual(forecast.audit[0], {
    name: "Unclassified Blast",
    quantity: 2,
    section: "Main",
    status: "review",
    classification: "Unmodeled damage text",
    reason: "The rules text mentions damage, but no current calculation classified it.",
  });
});

test("damage audit omits no-signal cards and classifies variable and combat cards", () => {
  const cards = new Map<string, Card>([
    ["Plain Utility", card("Plain Utility", "Draw a card.", { types: ["ACTION"], elements: ["NORM"] })],
    ["Refracting Missile", card("Refracting Missile", "Deal damage to target unit equal to the amount of Fractal objects you control plus 1.", { types: ["ACTION"], elements: ["WATER"] })],
    ["Shademist Priestess", card("Shademist Priestess", "Whenever your champion is dealt damage, recover 1.", { types: ["ALLY"], elements: ["WATER"], power: 0 })],
  ]);
  const forecast = computeAggressionForecast(Array.from(cards.keys(), (name) => ({ name, quantity: 1 })), cards);

  assert.equal(forecast.audit.some((entry) => entry.name === "Plain Utility"), false);
  assert.equal(forecast.audit.find((entry) => entry.name === "Refracting Missile")?.classification, "Variable damage");
  assert.equal(forecast.audit.find((entry) => entry.name === "Shademist Priestess")?.classification, "Combat damage");
});

test("advanced-element damage waits until the turn-four checkpoint", () => {
  const advanced = card("Tera Bolt", "Deal 6 damage to target champion.", { types: ["ACTION"], elements: ["TERA"] });
  const forecast = computeAggressionForecast([{ name: advanced.name, quantity: 4 }], new Map([[advanced.name, advanced]]));

  assert.equal(forecast.points[0].expectedMax, 0);
  assert.ok(forecast.points[1].expectedMax > 0);
  assert.match(forecast.audit[0]?.reason ?? "", /turn 4/);
});
