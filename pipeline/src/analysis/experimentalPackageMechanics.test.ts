import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nominateMechanics, measureMechanics, compatibleElements, type MechanicsCard } from "./experimentalPackageMechanics.js";
const catalog = JSON.parse(readFileSync(new URL("./fixtures/package-mechanics-cards.json", import.meta.url), "utf8")) as MechanicsCard[];
const nominations = nominateMechanics(catalog);
const has = (a: string, b: string) => nominations.some(n => n.cards[0] === a && n.cards[1] === b);

test("actual catalog nominates explicit Cardistry and legal memory targets", () => {
  assert.ok(has("The Duchess's Thornes", "Duchess, Six of Hearts"));
  assert.ok(has("Four of Hearts", "Two of Spades"));
  assert.ok(!has("Four of Hearts", "Duchess, Six of Hearts"));
  assert.ok(!has("Four of Hearts", "Bleu, Ace of Diamonds"));
});
test("shared Suited subtype and two amplifiers do not qualify", () => {
  assert.ok(!has("Senaris, Six of Diamonds", "Nipping Kicker"));
  assert.ok(has("Senaris, Six of Diamonds", "Bolt of Diamonds"));
  assert.ok(!has("Two of Spades", "Chance, Seven of Spades"));
  assert.ok(!compatibleElements({ name: "a", elements: ["FIRE"] }, { name: "b", elements: ["WATER"] }));
  assert.ok(!compatibleElements({ name: "a" }, { name: "b", elements: ["NORM"] }));
});
test("Raccoon nominations pair removal with a conditional payoff", () => {
  assert.ok(has("Scavenging Raccoon", "Banner Raccoon"));
  assert.ok(has("Protector Raccoon", "Excitable Raccoon"));
  assert.ok(!has("Banner Raccoon", "Sneaky Raccoon"));
});
test("usage excludes sideboards, deduplicates deck IDs, retains zero-use pairs and quantities", () => {
  const seeds = nominations.slice(0, 1);
  assert.equal(seeds.length, 1);
  const [a, b] = seeds[0].cards;
  const deck = { deckId: "1:alice", main: [[0, 2], [1, 3]] as [number, number][], material: [[0, 1]] as [number, number][], sideboard: [] };
  const index = { generatedAt: "fixture", cardNames: [a, b], decks: [deck, deck,
    { deckId: "2:bob", main: [[0, 1]] as [number, number][], material: [], sideboard: [[1, 4]] as [number, number][] }] };
  const [result] = measureMechanics(seeds, index);
  assert.equal(result.usage.totalDecks, 2);
  assert.equal(result.usage.togetherDecks, 1);
  assert.equal(result.usage.anchorInclusion, 0.5);
  assert.deepEqual(result.usage.quantities, { "3+3": 1 });
  const [empty] = measureMechanics(seeds, { ...index, decks: [] });
  assert.equal(empty.usage.togetherDecks, 0);
  assert.equal(empty.usage.anchorInclusion, null);
});
