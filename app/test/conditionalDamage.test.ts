import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeAggressionForecast } from "../src/lib/aggressionForecast";
import { damageDistribution, type DamageGroup } from "../src/lib/damageDistribution";

// Exact catalog text captured 2026-10-07; independent of pipeline/.cache.
const cards = JSON.parse(readFileSync(new URL("./fixtures/damage-cards.json", import.meta.url), "utf8")) as Card[];
const catalog = new Map(cards.map((card) => [card.name, card]));
const line = (name: string, quantity = 1) => ({ name, quantity });
const ten = (main: ReturnType<typeof line>[], material: ReturnType<typeof line>[] = []) => computeAggressionForecast(main, catalog, material).points[1];

function near(actual: number, expected: number) { assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`); }

test("Missile requires a co-drawn Fractal for its bonus, while preserving base damage", () => {
  const main = [line("Refracting Missile"), line("Fractal of Waves")];
  assert.equal(ten([main[0]]).expectedMax, 0.2);
  const result = damageDistribution([{ copies: 1, damage: 1, missile: 1 }, { copies: 1, damage: 0, fractals: 1 }], 60, 10);
  near(result.get(2)!, 10*9/(60*59));
  near(result.get(1)!, 10/60 - 10*9/(60*59));
  assert.equal(ten(main).expectedMax, Math.round((10/60 + 10*9/(60*59))*10)/10);
});

test("Shimmering Refraction and Conflagration automatically use co-drawn phantasias", () => {
  assert.equal(ten([line("Shimmering Refraction", 4)]).expectedMax, 0);
  assert.ok(ten([line("Shimmering Refraction", 4), line("Fractal of Waves", 4)]).expectedMax > 0);
  assert.equal(ten([line("Glowering Conflagration", 4)]).expectedMin, 0.7);
});

test("Fireball derives a natural level ceiling from a complete Material lineage", () => {
  const levels = [1, 2, 3, 4].map((level) => ({ name: `Test Champion ${level}`, types: ["CHAMPION"], subtypes: ["MAGE"], classes: ["MAGE"], level, elements: ["NORM"] } as Card));
  const local = new Map([...catalog, ...levels.map((card) => [card.name, card] as const)]);
  const main = [line("Fireball", 4)];
  const material = levels.map((card) => line(card.name));
  const first = computeAggressionForecast(main, local, material);
  const second = computeAggressionForecast(main, local, material, "second");
  assert.equal(first.points[0].expectedMax, 0.5); // level 0 at T1
  assert.equal(first.points[1].expectedMax, 2.7); // level 3 at T4
  assert.equal(second.points[1].expectedMax, 2); // level 2 at T3
  assert.equal(ten(main).expectedMax, 0.7); // no fabricated Material levels
  assert.equal(computeAggressionForecast(main, local, [line(levels[0].name), line(levels[2].name)]).points[1].expectedMax, 1.3); // cannot skip absent L2
});

test("Decaying Reproach uses joint wither-source access with shared counter limits", () => {
  assert.equal(ten([line("Decaying Reproach", 4)]).expectedMax, 2);
  const paired = ten([line("Decaying Reproach"), line("Frostlorn Caress")]);
  assert.equal(paired.chanceAtLeastTenMax, 0.025); // both cards must be drawn
  const distribution = damageDistribution([{ copies: 2, damage: 3, reproach: 4 }, { copies: 1, damage: 0, wither: 4 }], 3, 3);
  assert.deepEqual([...distribution], [[14, 1]]); // 3+3+8, not 11+11
  const early = computeAggressionForecast([line("Decaying Reproach"), line("Frostlorn Caress")], catalog);
  assert.equal(early.points[0].expectedMax, 0);
  assert.equal(computeAggressionForecast([line("Decaying Reproach")], catalog, [], "second").points[1].expectedMax, 0); // turn 3
});

test("Volatility needs a co-drawn compatible Potion and rolls its real dice distribution", () => {
  const source = line("Potion Infusion: Volatility");
  assert.equal(ten([source]).expectedMax, 0);
  const paired = ten([source, line("Potion of Healing")]);
  assert.equal(paired.chanceAtLeastFiveMax, 0.025);
  assert.equal(paired.chanceAtLeastTenMax, 0.004); // P(pair) * P(D6=6)
  const twoSources = damageDistribution([{ copies: 2, damage: 0, volatility: 1 }, { copies: 1, damage: 0, potions: 1 }], 3, 3);
  assert.deepEqual([...twoSources.keys()], [5,6,7,8,9,10]);
  const incompatible = ten([source, line("Explosive Concoction")]);
  assert.equal(incompatible.chanceAtLeastTenMax, 0); // rested Potion cannot pay its own REST cost
});

test("Cremator never assumes an empty hand, and missing class support removes its ceiling", () => {
  const main = [line("Ashwick Cremator", 4)];
  const material = [line("Diao Chan, Enchantress")];
  const forecast = computeAggressionForecast(main, catalog, material);
  assert.equal(forecast.points[0].expectedMax, 0); // class not yet active at level 0
  assert.equal(forecast.points[1].expectedMin, 0);
  assert.equal(forecast.points[1].expectedMax, 1.3);
  assert.equal(forecast.audit.find((entry) => entry.name === "Ashwick Cremator")?.status, "partial");
  assert.equal(ten(main).expectedMax, 0);
});

test("Ruby requires Guo Jia and stays separate as a post-materialization potential rate", () => {
  const ruby = line("Fabled Ruby Fatestone");
  assert.equal(computeAggressionForecast([], catalog, [ruby]).recurringDamagePerTurn, 0);
  const result = computeAggressionForecast([], catalog, [ruby, line("Guo Jia, Heaven's Favored")]);
  assert.equal(result.recurringDamagePerTurn, 1);
  assert.ok(result.points.every((point) => point.expectedMax === 0));
  assert.equal(result.audit[0].status, "partial");
});

test("Burst never sacrifices the same co-drawn Fractal for two copies", () => {
  const result = damageDistribution([{ copies: 2, damage: 2, burst: 2 }, { copies: 3, damage: 0, fractals: 1 }], 5, 5);
  assert.deepEqual([...result], [[10, 1]]);
  const paired = ten([line("Burst Asunder"), line("Fractal of Waves")]);
  assert.equal(paired.chanceAtLeastFiveMax, 0); // no rounded mean bonus may manufacture a 5-damage outcome
});

test("Bloom and Maiden use co-draw probability; Scepter requires four phantasias", () => {
  const material = [line("Diao Chan, Enchantress"), line("Scepter of Awakening")];
  const main = [line("Full Bloom"), line("Maiden of Waning Bloom")];
  const result = ten(main, material);
  assert.equal(result.chanceAtLeastTenMax, 0.025);
  assert.equal(result.expectedMax, 1.4);
  const bloomOnly = computeAggressionForecast([line("Full Bloom", 4)], catalog, material);
  assert.ok(bloomOnly.points.every((point) => point.high <= 8)); // Unique Bloom copies are one object, not four
  const supported = ten([line("Full Bloom"), line("Fractal of Waves", 3)], material);
  assert.equal(supported.chanceAtLeastTenMax, 0.0); // all four drawn: <0.0005, rounded to 3 decimals
  const exact = damageDistribution([{ copies: 1, damage: 0, bloom: 1, phantasias: 1, scepter: 8 }, { copies: 3, damage: 0, phantasias: 1, scepter: 4 }], 4, 4, { scepterAvailable: true });
  assert.deepEqual([...exact], [[16, 1]]);
});

test("joint distribution matches exhaustive physical-card draws and conserves probability", () => {
  const groups: DamageGroup[] = [
    { copies: 1, damage: 0, bloom: 1, phantasias: 1, scepter: 8 },
    { copies: 1, damage: 0, flowerbuds: 2, phantasias: 1 },
    { copies: 2, damage: 2, burst: 2 },
    { copies: 1, damage: 1, missile: 1 },
    { copies: 2, damage: 0, fractals: 1, phantasias: 1, scepter: 4 },
  ];
  const physical = groups.flatMap((group) => Array.from({ length: group.copies }, () => group));
  const expected = new Map<number, number>();
  for (let i = 0; i < 7; i++) for (let j = i+1; j < 7; j++) for (let k = j+1; k < 7; k++) for (let l = k+1; l < 7; l++) {
    const hand = [physical[i],physical[j],physical[k],physical[l]];
    const sum = (key: keyof DamageGroup) => hand.reduce((sum, card) => sum + Number(card[key] ?? 0), 0);
    const total = sum("damage") + (sum("bloom") ? 8 + 2*sum("flowerbuds") : 0)
      + (sum("phantasias") >= 4 ? Math.max(...hand.map((card) => card.scepter ?? 0)) : 0)
      + (sum("burst") ? 2*sum("fractals") : 0) + sum("missile")*sum("fractals");
    expected.set(total, (expected.get(total) ?? 0) + 1/35);
  }
  const actual = damageDistribution(groups, 7, 4, { scepterAvailable: true });
  assert.deepEqual([...actual.keys()].sort((a,b) => a-b), [...expected.keys()].sort((a,b) => a-b));
  for (const [damage, probability] of expected) near(actual.get(damage)!, probability);
  near([...actual.values()].reduce((a,b) => a+b, 0), 1);
});

test("duplicate deck lines preserve probabilities and unique objects count once", () => {
  assert.deepEqual(computeAggressionForecast([line("Fireball",4)],catalog), computeAggressionForecast([line("Fireball",2),line("Fireball",2)],catalog));
  const result = damageDistribution([{ copies: 2, damage: 0, uniqueObject: "Unique Phantasia", phantasias: 1 }, { copies: 1, damage: 0, refraction: 1 }], 3, 3);
  assert.deepEqual([...result], [[1,1]]);
});

test("complex state spaces use bounded reproducible sampling with conserved probability", () => {
  const groups = Array.from({ length: 18 }, (_, index) => ({ copies: 1, damage: 2 ** index }));
  const result = damageDistribution(groups, 60, 20);
  assert.equal(result.sampleSize, 32_768);
  near([...result.values()].reduce((a,b) => a+b, 0), 1);
  const exactMean = groups.reduce((sum, group) => sum + group.damage, 0) / 3;
  const estimatedMean = [...result].reduce((sum, [damage, probability]) => sum + damage * probability, 0);
  assert.ok(Math.abs(estimatedMean - exactMean) < exactMean * 0.02);
  assert.deepEqual(result, damageDistribution([...groups].reverse(), 60, 20));
});
