import assert from "node:assert/strict";
import test from "node:test";
import type { CardSignature } from "../cards/catalog.js";
import type { ArchetypeTaxonomyData } from "@gatcg/shared";
import { applyArchetypeLineageAliases, archetypePackageOverlap, isArchetypeStrategyCard, winRateWilsonInterval } from "./archetypeTaxonomy.js";

function card(types: string[]): CardSignature {
  return {
    name: "Test Card",
    slug: "test-card",
    classes: [],
    types,
    subtypes: [],
    elements: [],
    level: null,
    effect: null,
    editions: [],
  };
}

test("excludes Champion and Spirit identity cards from archetype signatures", () => {
  assert.equal(isArchetypeStrategyCard(card(["CHAMPION"])), false);
  assert.equal(isArchetypeStrategyCard(card(["spirit"])), false);
});

test("requires a recurring multi-card main-deck package to group builds", () => {
  const slimes = [{ name: "Storm Slime" }, { name: "Limitless Slime" }, { name: "Gather Slimes" }];
  assert.equal(archetypePackageOverlap(slimes, [{ name: "Storm Slime" }, { name: "Limitless Slime" }, { name: "Ethereal Slime" }]), 2 / 3);
  assert.equal(archetypePackageOverlap(slimes, [{ name: "Storm Slime" }, { name: "Dungeon Guide" }]), 0);
  assert.equal(archetypePackageOverlap([], slimes), 0);
});

test("retains strategic material cards and unresolved submissions", () => {
  assert.equal(isArchetypeStrategyCard(card(["REGALIA", "ITEM"])), true);
  assert.equal(isArchetypeStrategyCard(undefined), true);
});

test("computes bounded win-rate uncertainty that narrows with sample size", () => {
  const small = winRateWilsonInterval(5, 10);
  const large = winRateWilsonInterval(50, 100);
  assert.ok(small.low >= 0 && small.high <= 1);
  assert.ok(large.high - large.low < small.high - small.low);
  assert.deepEqual(winRateWilsonInterval(0, 0), { low: 0, high: 1, matches: 0 });
});

test("preserves retired archetype ids when most member decks move together", () => {
  const cluster = (id: string, deckIds: string[]) => ({ id, deckIds });
  const previous = { clusters: [cluster("old", ["a", "b", "c"])], aliases: {} } as ArchetypeTaxonomyData;
  const current = { clusters: [cluster("new", ["a", "b", "c", "d"])], aliases: {} } as ArchetypeTaxonomyData;
  assert.equal(applyArchetypeLineageAliases(current, previous).aliases.old, "new");
});
