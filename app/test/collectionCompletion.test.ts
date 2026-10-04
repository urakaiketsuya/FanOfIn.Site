import assert from "node:assert/strict";
import test from "node:test";
import { collectionCompletionLines, computeDeckCollectionStatus, type CollectionEntry } from "@gatcg/shared";
import { deckCollectionLines } from "../src/features/collection/collectionBatch";

const entry = (ownedQuantity: number, editionUuid?: string, proxyQuantity = 0): CollectionEntry => ({ cardUuid: "card", cardName: "Card", ownedQuantity, proxyQuantity, editionUuid, updatedAt: "" });
const required = [{ cardUuid: "card", cardName: "Card", quantity: 4 }];

test("mark owned fills only the physical shortfall across printings and preserves proxies", () => {
  const entries = [entry(1, undefined, 3), entry(2, "edition")];
  const before = JSON.stringify(entries);
  const lines = collectionCompletionLines(required, entries);
  assert.deepEqual(lines, [{ cardUuid: "card", cardName: "Card", quantity: 2, proxyQuantity: 3 }]);
  assert.equal(JSON.stringify(entries), before);
  const after = [entry(lines[0].quantity, undefined, lines[0].proxyQuantity), entry(2, "edition")];
  assert.equal(computeDeckCollectionStatus({ main: [{ card: "Card", quantity: 4 }], material: [], sideboard: [] }, after).complete, true);
  assert.deepEqual(collectionCompletionLines(required, after), []);
});

test("already owned copies, including editions only and larger totals, are never inflated", () => {
  assert.deepEqual(collectionCompletionLines(required, [entry(4, "edition")]), []);
  assert.deepEqual(collectionCompletionLines(required, [entry(10), entry(2, "edition")]), []);
  assert.deepEqual(collectionCompletionLines(required, [entry(0, undefined, 4)]), [{ cardUuid: "card", cardName: "Card", quantity: 4, proxyQuantity: 4 }]);
});

test("recipe completion honors sideboard scope and card copies shared across sections", () => {
  const deck = { main: [{ card: "Card", quantity: 3 }], material: [], sideboard: [{ card: "Card", quantity: 1 }] };
  const catalog = [{ uuid: "card", name: "Card" }] as Parameters<typeof deckCollectionLines>[1];
  assert.equal(collectionCompletionLines(deckCollectionLines(deck, catalog, true), [entry(2)])[0].quantity, 4);
  assert.equal(collectionCompletionLines(deckCollectionLines(deck, catalog, false), [entry(2)])[0].quantity, 3);
  assert.deepEqual(collectionCompletionLines([], []), []);
});

test("cross-deck completion stages only the remaining physical shortfall over existing drafts", async () => {
  const { crossDeckCollectionShortages } = await import("../src/features/collection/collectionBatch");
  const { stageCollectionQuantities } = await import("../src/features/collection/collectionQuantityDrafts");
  const saved = [entry(1, undefined, 3), entry(2, "edition")];
  const drafts = { "card:canonical": { cardUuid: "card", cardName: "Card", quantity: 2, proxyQuantity: 3 } };
  const effective = [entry(2, undefined, 3), entry(2, "edition")];
  const decks = [1, 2].map(id => ({ id: String(id), title: `Deck ${id}`, decklist: { main: [{ card: "Card", quantity: 3 }], material: [], sideboard: [{ card: "Card", quantity: 1 }] } })) as Parameters<typeof crossDeckCollectionShortages>[0];
  const shortages = crossDeckCollectionShortages(decks, effective, true);
  assert.equal(shortages[0].missing, 4);
  const targets = shortages.map(line => ({ cardUuid: "card", cardName: line.card, quantity: line.totalRequired }));
  const staged = stageCollectionQuantities(drafts, saved, collectionCompletionLines(targets, effective), "at-least");
  assert.deepEqual(staged["card:canonical"], { cardUuid: "card", cardName: "Card", quantity: 6, proxyQuantity: 3, expectedOwnedQuantity: 1, expectedProxyQuantity: 3 });
  assert.equal(saved[1].ownedQuantity, 2);
  assert.deepEqual(collectionCompletionLines(targets, [entry(6, undefined, 3), saved[1]]), []);
});
