import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeAggressionForecast } from "../src/lib/aggressionForecast";
import { damageDistribution } from "../src/lib/damageDistribution";

// Reviewed outcome contracts, not generated snapshots or a live PHP dependency.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/tcgengine-damage-contracts.json", import.meta.url), "utf8"));
const catalog = new Map<string, Card>(fixture.cards.map((card: Card) => [card.name, card]));
const contracts = fixture.contracts;
const line = (name: string, quantity = 1) => ({ name, quantity });
const rounded = (value: number) => Math.round(value * 10) / 10;

test("TCGEngine: champion-only fixed damage survives catalog recognition", () => {
  const result = computeAggressionForecast([line("Arcane Blast")], catalog);
  assert.equal(result.points[0].expectedMax, 0); // Existing advanced-element timing assumption.
  assert.equal(result.points[1].expectedMax, rounded(contracts.fixed.damage * 10 / 60));
  assert.equal(computeAggressionForecast([line("Arcane Blast")], catalog, [], "second").points[1].expectedMax, 0);
});

test("TCGEngine: Thunderclap's level discount never grants champion targeting", () => {
  for (const material of [[], [line("Diao Chan, Enchantress")]]) {
    const result = computeAggressionForecast([line("Thunderclap", 4)], catalog, material);
    assert.ok(result.points.every(point => point.expectedMax === contracts.allyOnly.championDamage));
  }
});

test("TCGEngine: Fireball at level two deals three; its class bonus only discounts cost", () => {
  // Synthetic lineage supplies only the analytical level input; it is not engine fixture state.
  const champions = [1, 2].map(level => ({
    name: `Contract champion ${level}`, level, types: ["CHAMPION"],
    classes: ["WARRIOR"], subtypes: ["WARRIOR"], elements: ["FIRE"],
  } as Card));
  const local = new Map([...catalog, ...champions.map(card => [card.name, card] as const)]);
  const result = computeAggressionForecast([line("Fireball")], local, champions.map(card => line(card.name)));
  assert.equal(result.points[1].expectedMax, rounded(contracts.level.damage * 10 / 60));
  assert.deepEqual([...damageDistribution([{ copies: 1, damage: 1, levelDamage: 1 }], 1, 1, { level: contracts.level.level })], [[contracts.level.damage, 1]]);
});

test("TCGEngine: Burst's consumed Fractals contribute once across multiple spells", () => {
  const { baseDamage, damage, fractals } = contracts.burst;
  assert.deepEqual([...damageDistribution([
    { copies: 1, damage: baseDamage, burst: 2 },
    { copies: fractals, damage: 0, fractals: 1 },
  ], 3, 3)], [[damage, 1]]);
  // Derived conservation case: a second Burst adds its base, not another sacrifice.
  assert.deepEqual([...damageDistribution([
    { copies: 2, damage: baseDamage, burst: 2 },
    { copies: fractals, damage: 0, fractals: 1 },
  ], 4, 4)], [[damage + baseDamage, 1]]);
  // Public model: independent probability of a Fractal plus at least one of two Bursts.
  const main = [line("Burst Asunder", 2), line("Fractal of Rain"), line("Fractal of Snow")];
  const result = computeAggressionForecast(main, catalog).points[1];
  const probabilityFractalAndAnyBurst = 10 / 60 * (1 - 50 * 49 / (59 * 58));
  assert.equal(result.expectedMax, rounded(2 * baseDamage * 10 / 60 + 2 * baseDamage * probabilityFractalAndAnyBurst));
});

test("TCGEngine: Cremator's empty-hand damage remains conditional and needs class support", () => {
  const main = [line("Ashwick Cremator")];
  const supported = computeAggressionForecast(main, catalog, [line("Diao Chan, Enchantress")]);
  assert.equal(supported.points[1].expectedMin, contracts.conditional.negativeDamage);
  assert.equal(supported.points[1].expectedMax, rounded(contracts.conditional.damage * 10 / 60));
  assert.equal(supported.audit.find(entry => entry.name === main[0].name)?.status, "partial");
  assert.ok(computeAggressionForecast(main, catalog).points.every(point => point.expectedMax === 0));
});
