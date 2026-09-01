import assert from "node:assert/strict";
import test from "node:test";
import type { CardSignature } from "../cards/catalog.js";
import type { ArchetypeTaxonomyData } from "@gatcg/shared";
import { applyArchetypeLineageAliases, archetypePackageOverlap, consolidateNearDuplicateClusters, isArchetypeStrategyCard, materialIdentitySignature, materialRouteName, winRateWilsonInterval } from "./archetypeTaxonomy.js";

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

test("uses Champion and Spirit material cards as a hard build-path boundary", () => {
  const crux = card(["CHAMPION"]);
  const wind = card(["SPIRIT"]);
  const path = materialIdentitySignature([
    { name: "Lorraine, Crux Knight", quantity: 1, card: crux },
    { name: "Spirit of Wind", quantity: 1, card: wind },
    { name: "Safeguard Amulet", quantity: 1, card: card(["REGALIA"]) },
  ]);
  assert.equal(path, "Lorraine, Crux Knight:1|Spirit of Wind:1");
});

test("merges Spirits under the highest Champion material route", () => {
  const level1 = { ...card(["CHAMPION"]), level: 1 };
  const crux = { ...card(["CHAMPION"]), level: 3 };
  const spirit = { ...card(["CHAMPION"]), level: 0, subtypes: ["SPIRIT"] };
  assert.equal(materialRouteName([
    { name: "Lorraine, Wandering Warrior", card: level1 },
    { name: "Spirit of Wind", card: spirit },
    { name: "Lorraine, Crux Knight", card: crux },
  ], "Lorraine"), "Lorraine, Crux Knight");
});

test("requires a recurring multi-card main-deck package to group builds", () => {
  const slimes = [{ name: "Storm Slime" }, { name: "Limitless Slime" }, { name: "Gather Slimes" }];
  assert.equal(archetypePackageOverlap(slimes, [{ name: "Storm Slime" }, { name: "Limitless Slime" }, { name: "Ethereal Slime" }]), 2 / 3);
  assert.equal(archetypePackageOverlap(slimes, [{ name: "Storm Slime" }, { name: "Dungeon Guide" }]), 0);
  assert.equal(archetypePackageOverlap([], slimes), 0);
});

test("consolidates near-identical centroids without crossing material identities", () => {
  const group = (name: string, cards: [string, number][], identity = "wind", family = identity) => ({
    cardCounts: new Map(cards), mainCardCounts: new Map(cards), materialCardCounts: new Map(),
    materialIdentitySignature: identity, materialFamilySignature: family, deckIds: [name], players: new Set([name.length]), championTallies: new Map(),
  });
  const cluster = (name: string, cards: [string, number][], identity = "wind", family = identity) => ({
    seedCards: new Map(cards), seedSignature: name, members: [group(name, cards, identity, family)],
    players: new Set([name.length]), materialIdentitySignature: identity, materialFamilySignature: family,
  });
  const base: [string, number][] = [["Surveil", 4], ["Incapacitate", 4], ["Guide", 4]];
  const near: [string, number][] = [["Surveil", 4], ["Incapacitate", 4], ["Guide", 3]];
  assert.equal(consolidateNearDuplicateClusters([cluster("base", base), cluster("near", near)]).length, 1);
  assert.equal(consolidateNearDuplicateClusters([cluster("base", base), cluster("other", near, "fire")]).length, 2);
  assert.equal(consolidateNearDuplicateClusters([cluster("base", base, "wind-l1", "wind"), cluster("near", near, "wind-l2", "wind")]).length, 1);
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
