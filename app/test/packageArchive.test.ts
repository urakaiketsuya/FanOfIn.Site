import assert from "node:assert/strict";
import test from "node:test";
import { packageBannedCards } from "../src/features/cards/packageArchive";

const catalog = new Map([
  ["Banned", { legality: { STANDARD: { limit: 0 } } }],
  ["Limited", { legality: { STANDARD: { limit: 1 } } }],
  ["Other format", { legality: { STANDARD: { limit: 4 }, PANTHEON: { limit: 0 } } }],
  ["Unknown", { legality: null }],
]);

test("a banned member archives the whole pool, including optional members", () => {
  assert.deepEqual(packageBannedCards({ cards: ["Limited", "Banned"] }, catalog), ["Banned"]);
});

test("limited cards, other-format bans, and missing legality do not imply a Standard ban", () => {
  assert.deepEqual(packageBannedCards({ cards: ["Limited", "Other format", "Unknown", "Missing"] }, catalog), []);
});

test("archive eligibility follows refreshed catalog legality without changing saved packages", () => {
  const pkg = { cards: ["Banned"] };
  assert.equal(packageBannedCards(pkg, catalog).length, 1);
  assert.deepEqual(packageBannedCards(pkg, new Map([["Banned", { legality: { STANDARD: { limit: 4 } } }]])), []);
  assert.deepEqual(pkg.cards, ["Banned"]);
});
