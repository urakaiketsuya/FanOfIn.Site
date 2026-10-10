import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card, CollectionEntry, SavedDeck } from "@gatcg/shared";
import { collectionGoalOptions, collectionGoalProgress, parseCollectionGoal } from "../src/features/collection/collectionGoals";
const cards = ["A", "B"].map(uuid => ({ uuid, name: uuid, editions: [{ set: { prefix: "ALC 1st", name: "ALC" } }, { set: { prefix: "ALC Alter", name: "ALC" } }] })) as Card[];
const entry = (cardUuid: string, ownedQuantity: number, proxyQuantity = 0) => ({ cardUuid, ownedQuantity, proxyQuantity }) as CollectionEntry;
const deck = { id: "deck", title: "My deck", decklist: { main: [{ card: "A", quantity: 2 }, { card: "Unknown", quantity: 1 }], material: [{ card: " a ", quantity: 1 }], sideboard: [{ card: "B", quantity: 4 }] } } as SavedDeck;
test("set goals deduplicate families and printings, pool ownership, and exclude proxies", () => {
  const options = collectionGoalOptions(cards, []);
  assert.equal(options.length, 1);
  assert.equal(options[0].id, "ALC");
  const progress = collectionGoalProgress(options[0].requirements, [entry("A", 1), entry("A", 5), entry("B", 0, 4)]);
  assert.equal(progress.total, 2);
  assert.equal(progress.covered, 1);
  assert.equal(progress.complete, false);
});
test("deck goals aggregate main/material, exclude sideboard, and retain unresolved cards", () => {
  const [goal] = collectionGoalOptions(cards, [deck]);
  const progress = collectionGoalProgress(goal.requirements, [entry("A", 99), entry("B", 4)]);
  assert.equal(progress.total, 4);
  assert.equal(progress.covered, 3);
  assert.equal(progress.rows.find(row => row.name === "Unknown")?.missing, 1);
  assert.equal(progress.complete, false);
});
test("completion regresses after a correction and empty goals never complete", () => {
  const [goal] = collectionGoalOptions(cards, []);
  assert.equal(collectionGoalProgress(goal.requirements, [entry("A", 1), entry("B", 1)]).complete, true);
  assert.equal(collectionGoalProgress(goal.requirements, [entry("A", 1)]).complete, false);
  assert.equal(collectionGoalProgress([], []).complete, false);
});
test("stored goal references validate before use", () => {
  assert.deepEqual(parseCollectionGoal('{"kind":"deck","id":"one"}'), {kind:"deck",id:"one"});
  assert.equal(parseCollectionGoal(null), null);
  assert.equal(parseCollectionGoal("null"), null);
  for (const invalid of ['{', '{}', '42', '{"kind":"other","id":"one"}', '{"kind":"set","id":""}']) assert.throws(() => parseCollectionGoal(invalid));
});
