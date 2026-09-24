import assert from "node:assert/strict";
import test from "node:test";
import { computeDeckCollectionStatus, type Card } from "@gatcg/shared";
import { collectionCsv, crossDeckCollectionShortages, deckCollectionLines, decklistsCollectionBackfillLines, missingCollectionList, setRarityCollectionLines, summarizeAtLeastChanges } from "../src/features/collection/collectionBatch";

function card(uuid: string, name: string, editions: Array<[string, number]> = []): Card {
  return { uuid, name, slug: name, classes: [], types: [], subtypes: [], elements: [], element: "", cost: { type: "none", value: null }, cost_memory: null, cost_reserve: null, power: null, speed: null, life: null, level: null, durability: null, effect: null, effect_html: null, effect_raw: null, flavor: null, references: [], referenced_by: [], legality: null, last_update: "", editions: editions.map(([prefix, rarity], index) => ({ uuid: `${uuid}-${index}`, card_id: uuid, slug: name, collector_number: String(index), configuration: "normal", orientation: null, rarity, illustrator: null, image: "", set: { id: prefix, name: prefix, prefix, language: "EN", release_date: "", created_at: "", last_update: "" }, effect: null, effect_html: null, effect_raw: null, flavor: null, last_update: "", created_at: "" })) };
}

test("deck lines combine sections and optionally omit sideboard", () => {
  const cards = [card("a", "Alpha"), card("b", "Beta")];
  const deck = { main: [{ card: " alpha ", quantity: 3 }], material: [{ card: "Alpha", quantity: 1 }], sideboard: [{ card: "Beta", quantity: 2 }] };
  assert.deepEqual(deckCollectionLines(deck, cards, false), [{ cardUuid: "a", cardName: "Alpha", quantity: 4 }]);
  assert.equal(deckCollectionLines(deck, cards, true).find((line) => line.cardUuid === "b")?.quantity, 2);
});

test("decklist backfill uses the highest observed quantity and caps each unique card at four", () => {
  const cards = [card("a", "Alpha"), card("b", "Beta")];
  const decks = [
    { main: [{ card: "Alpha", quantity: 3 }], material: [], sideboard: [{ card: "Beta", quantity: 2 }] },
    { main: [{ card: " alpha ", quantity: 6 }], material: [{ card: "Beta", quantity: 1 }], sideboard: [] },
  ];
  assert.deepEqual(decklistsCollectionBackfillLines(decks, cards), [
    { cardUuid: "a", cardName: "Alpha", quantity: 4 },
    { cardUuid: "b", cardName: "Beta", quantity: 2 },
  ]);
});

test("set rarity lines deduplicate printings and use the largest selected rarity quantity", () => {
  const cards = [card("a", "Alpha", [["SET", 1], ["SET", 3]]), card("b", "Beta", [["SET", 2]]), card("c", "Other", [["OLD", 1]])];
  assert.deepEqual(setRarityCollectionLines(cards, "SET", { 1: 4, 2: 4, 3: 1 }), [
    { cardUuid: "a", cardName: "Alpha", quantity: 4 },
    { cardUuid: "b", cardName: "Beta", quantity: 4 },
  ]);
});

test("at-least summary distinguishes covered cards from copies that would be added", () => {
  const summary = summarizeAtLeastChanges([{ cardUuid: "a", cardName: "Alpha", quantity: 4 }, { cardUuid: "b", cardName: "Beta", quantity: 2 }], [{ cardUuid: "a", cardName: "Alpha", ownedQuantity: 1, proxyQuantity: 0, updatedAt: "" }, { cardUuid: "b", cardName: "Beta", ownedQuantity: 3, proxyQuantity: 0, updatedAt: "" }]);
  assert.deepEqual(summary, { affectedCards: 1, addedCopies: 3, coveredCards: 1 });
});

test("cross-deck shortages deduplicate cards while preserving each deck's demand", () => {
  const decks = [
    { id: "one", title: "First", decklist: { main: [{ card: "Alpha", quantity: 4 }], material: [], sideboard: [{ card: "Beta", quantity: 2 }] } },
    { id: "two", title: "Second", decklist: { main: [{ card: " alpha ", quantity: 3 }], material: [{ card: "Beta", quantity: 1 }], sideboard: [] } },
  ] as never;
  const entries = [
    { cardUuid: "a", cardName: "ALPHA", ownedQuantity: 5, proxyQuantity: 0, updatedAt: "" },
    { cardUuid: "b", cardName: "Beta", ownedQuantity: 1, proxyQuantity: 0, updatedAt: "" },
  ];
  assert.deepEqual(crossDeckCollectionShortages(decks, entries), [
    { card: "Alpha", totalRequired: 7, owned: 5, missing: 2, decks: [{ deckId: "one", title: "First", quantity: 4 }, { deckId: "two", title: "Second", quantity: 3 }] },
    { card: "Beta", totalRequired: 3, owned: 1, missing: 2, decks: [{ deckId: "one", title: "First", quantity: 2 }, { deckId: "two", title: "Second", quantity: 1 }] },
  ]);
  assert.equal(crossDeckCollectionShortages(decks, entries, false).some((entry) => entry.card === "Beta"), false);
});

test("deck-surface ownership normalizes names and includes sideboard demand", () => {
  const deck = { main: [{ card: " Alpha  Card ", quantity: 3 }], material: [{ card: "Beta", quantity: 1 }], sideboard: [{ card: "alpha card", quantity: 1 }] };
  const collection = [
    { cardUuid: "a", cardName: "ALPHA CARD", ownedQuantity: 2, proxyQuantity: 1, updatedAt: "" },
    { cardUuid: "b", cardName: "Beta", ownedQuantity: 1, proxyQuantity: 0, updatedAt: "" },
  ];
  const withSideboard = computeDeckCollectionStatus(deck, collection);
  assert.equal(withSideboard.requiredCopies, 5);
  assert.equal(withSideboard.missingCopies, 2);
  assert.equal(withSideboard.proxyCopies, 1);
  assert.equal(withSideboard.lines.find((line) => line.card.trim().startsWith("Alpha"))?.missing, 2);
  assert.equal(computeDeckCollectionStatus(deck, collection, false).missingCopies, 1);
});

test("canonical coverage pools legacy quantities and alternate printing quantities", () => {
  const deck = { main: [{ card: "Alpha", quantity: 4 }], material: [], sideboard: [] };
  const collection = [
    { cardUuid: "a", cardName: "Alpha", ownedQuantity: 1, proxyQuantity: 0, updatedAt: "" },
    { cardUuid: "a", cardName: "ALPHA", editionUuid: "set-a", setPrefix: "A", collectorNumber: "1", ownedQuantity: 2, proxyQuantity: 0, updatedAt: "" },
    { cardUuid: "a", cardName: "Alpha", editionUuid: "set-b", setPrefix: "B", collectorNumber: "9", ownedQuantity: 1, proxyQuantity: 0, updatedAt: "" },
  ];
  assert.equal(computeDeckCollectionStatus(deck, collection).missingCopies, 0);
});

test("build-every-deck allocates one pooled printing inventory across simultaneous demand", () => {
  const decks = [
    { id: "one", title: "One", decklist: { main: [{ card: "Alpha", quantity: 3 }], material: [], sideboard: [] } },
    { id: "two", title: "Two", decklist: { main: [{ card: "Alpha", quantity: 3 }], material: [], sideboard: [] } },
  ] as never;
  const entries = [
    { cardUuid: "a", cardName: "Alpha", editionUuid: "first", ownedQuantity: 2, proxyQuantity: 0, updatedAt: "" },
    { cardUuid: "a", cardName: "Alpha", editionUuid: "second", ownedQuantity: 2, proxyQuantity: 0, updatedAt: "" },
  ];
  assert.deepEqual(crossDeckCollectionShortages(decks, entries), [{ card: "Alpha", totalRequired: 6, owned: 4, missing: 2, decks: [{ deckId: "one", title: "One", quantity: 3 }, { deckId: "two", title: "Two", quantity: 3 }] }]);
});

test("collection exports retain printing identity and shortage exports stay deduplicated", () => {
  const csv = collectionCsv([{ cardUuid: "a", cardName: "Alpha", editionUuid: "print-1", setPrefix: "SET", collectorNumber: "007", ownedQuantity: 2, proxyQuantity: 1, updatedAt: "" }]);
  assert.match(csv, /a,"Alpha",print-1,SET,007,2,1/);
  assert.equal(missingCollectionList([{ card: "Alpha", missing: 2 }, { card: "Beta", missing: 1 }]), "2 Alpha\n1 Beta");
});
