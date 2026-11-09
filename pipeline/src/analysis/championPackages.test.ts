import { test } from "node:test";
import assert from "node:assert/strict";
import { computeChampionPackages } from "./championPackages.js";
import { buildCardIndex, type CardSignature } from "../cards/catalog.js";
import type { StapleObservation } from "./cardStaples.js";

const card = (name: string, overrides: Partial<CardSignature> = {}): CardSignature => ({ name, slug: name.toLowerCase().replaceAll(" ", "-"), types: ["ACTION"], classes: [], subtypes: [], elements: [], level: null, cost_reserve: 1, effect: null, editions: [], ...overrides });
const catalog = buildCardIndex([card("A"), card("B"), card("New"), card("Rare"), card("Jin, Three", { types: ["CHAMPION"], level: 3 })]);
const obs = (n: number, recent: boolean, main: [string, number][]): StapleObservation[] => Array.from({ length: n }, () => ({
  raw: { main: main.map(([name, quantity]) => ({ card: name, quantity })), material: [{ card: "Jin, Three", quantity: 1 }] }, format: "standard", periods: recent ? ["all", "90"] : ["all"] }));

test("recent decks define the core, variants count only complete decks, champion cards are left out", () => {
  const data = computeChampionPackages([
    ...obs(60, false, [["A", 4], ["B", 4]]), ...obs(40, true, [["A", 4], ["B", 3], ["New", 4]]), ...obs(20, true, [["A", 4], ["B", 4], ["New", 2]]),
    ...obs(10, true, [["A", 4], ["Rare", 1]]),
  ], catalog, "fixed", null);
  const pack = data.packages.find(p => p.championCard === "Jin, Three")!;
  assert.equal(pack.basis, "recent"); assert.equal(pack.decks, 130); assert.equal(pack.recentDecks, 70);
  assert.deepEqual(pack.core.map(c => c.name).sort(), ["A", "B", "New"]);
  assert.ok(!pack.core.some(c => c.name.startsWith("Jin")));
  const fresh = pack.core.find(c => c.name === "New")!;
  assert.ok(fresh.allInclusion < 0.5 && fresh.recentInclusion! > 0.8);
  assert.equal(pack.completeDecks, 60); assert.equal(pack.completeRecentDecks, 60);
  assert.deepEqual(pack.variants.map(v => v.decks), [40, 20]);
  assert.ok(pack.options.every(c => c.name !== "A"));
});
test("builds under the minimum deck count publish nothing", () => {
  assert.equal(computeChampionPackages(obs(50, true, [["A", 4], ["B", 4]]), catalog, "fixed", null).packages.length, 0);
});
test("package variants require main and material together; sideboard copies cannot complete a core", () => {
  const index = buildCardIndex([card("Seething"), card("Plate", { types: ["REGALIA"] }), card("Jin, Three", { types: ["CHAMPION"], level: 3 })]);
  const entries = obs(100, true, [["Seething", 4]]);
  entries.forEach((entry, i) => {
    if (i < 80) entry.raw.material!.push({ card: "Plate", quantity: 1 });
    else entry.raw.sideboard = [{ card: "Plate", quantity: 1 }];
    if (i < 30) entry.raw.main = [{ card: "Seething", quantity: 3 }];
  });
  const pack = computeChampionPackages(entries, index, "fixed", null).packages.find(p => p.championCard === "Jin, Three")!;
  assert.equal(pack.completeDecks, 80);
  assert.equal(pack.completeRecentDecks, 80);
  assert.deepEqual(pack.core.map(c => [c.section, c.name]), [["main", "Seething"], ["material", "Plate"]]);
  assert.deepEqual(pack.variants, [
    { copies: [4, 1], decks: 50, recentDecks: 50 },
    { copies: [3, 1], decks: 30, recentDecks: 30 },
  ]);
});
test("Jin Exia pool preserves the build denominator and counts its own complete variants", () => {
  const index = buildCardIndex([
    card("A", { elements: ["EXIA"] }), card("B", { elements: ["EXIA"] }),
    card("Other", { elements: ["FIRE"] }),
    card("Jin, Undying Resolve", { types: ["CHAMPION"], level: 3, elements: ["EXIA"] }),
  ]);
  const entries = obs(100, true, [["A", 4], ["B", 3], ["Other", 4]]);
  entries.forEach((entry, i) => {
    entry.raw.material = [{ card: "Jin, Undying Resolve", quantity: 1 }];
    if (i >= 80) {
      entry.raw.main = [{ card: "Other", quantity: 4 }];
      entry.raw.sideboard = [{ card: "A", quantity: 4 }, { card: "B", quantity: 3 }];
    }
  });
  const data = computeChampionPackages(entries, index, "fixed", null);
  const pack = data.packages.find(p => p.element === "EXIA")!;
  assert.equal(pack.decks, 100);
  assert.equal(pack.completeDecks, 80);
  assert.deepEqual(pack.core.map(c => c.name), ["A", "B"]);
  assert.ok(pack.core.every(c => c.recentInclusion === 0.8));
  assert.deepEqual(pack.variants, [{ copies: [4, 3], decks: 80, recentDecks: 80 }]);
  assert.ok(data.packages.find(p => p.championCard === "Jin, Undying Resolve" && !p.element)?.core.some(c => c.name === "Other"));
});
