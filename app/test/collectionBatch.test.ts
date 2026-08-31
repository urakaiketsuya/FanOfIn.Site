import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { deckCollectionLines, setRarityCollectionLines, summarizeAtLeastChanges } from "../src/features/collection/collectionBatch";

function card(uuid: string, name: string, editions: Array<[string, number]> = []): Card {
  return { uuid, name, slug: name, classes: [], types: [], subtypes: [], elements: [], element: "", cost: { type: "none", value: null }, cost_memory: null, cost_reserve: null, power: null, speed: null, life: null, level: null, durability: null, effect: null, effect_html: null, effect_raw: null, flavor: null, references: [], referenced_by: [], legality: null, last_update: "", editions: editions.map(([prefix, rarity], index) => ({ uuid: `${uuid}-${index}`, card_id: uuid, slug: name, collector_number: String(index), configuration: "normal", orientation: null, rarity, illustrator: null, image: "", set: { id: prefix, name: prefix, prefix, language: "EN", release_date: "", created_at: "", last_update: "" }, effect: null, effect_html: null, effect_raw: null, flavor: null, last_update: "", created_at: "" })) };
}

test("deck lines combine sections and optionally omit sideboard", () => {
  const cards = [card("a", "Alpha"), card("b", "Beta")];
  const deck = { main: [{ card: " alpha ", quantity: 3 }], material: [{ card: "Alpha", quantity: 1 }], sideboard: [{ card: "Beta", quantity: 2 }] };
  assert.deepEqual(deckCollectionLines(deck, cards, false), [{ cardUuid: "a", cardName: "Alpha", quantity: 4 }]);
  assert.equal(deckCollectionLines(deck, cards, true).find((line) => line.cardUuid === "b")?.quantity, 2);
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
