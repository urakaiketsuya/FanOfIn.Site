import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeSavedDecklist, extractDeckPrintings, savedDeckIdentityInput, withDeckPrintings, validPrintingAllocations, printingCardLine, type Card } from "@gatcg/shared";
import { editDeck, selectedMovePrintings, type EditableDeck } from "../src/lib/deckEditing";
import { parseDecklist } from "../src/features/compare/parseDecklist";
import { prepareCollectionBatch, type CollectionDrafts } from "../src/features/collection/collectionSaveQueue";
const line = { card: "Card", quantity: 4, printings: [{ editionUuid: "e1", quantity: 2 }, { editionUuid: "e2", quantity: 1 }] };
const deck: EditableDeck = { main: [line], material: [], sideboard: [], maybeboard: [] };
const catalog = new Map([["Card", { name: "Card", types: ["ACTION"] } as Card]]);
test("printing metadata round-trips without changing gameplay identity", () => {
  assert.equal(savedDeckIdentityInput(deck), savedDeckIdentityInput(canonicalizeSavedDecklist(deck)));
  assert.deepEqual(withDeckPrintings(canonicalizeSavedDecklist(deck), extractDeckPrintings(deck)).main, [line]);
  assert.deepEqual(parseDecklist(`# Main\n${printingCardLine(line)}`).decklist.main, [line]);
  assert.equal(validPrintingAllocations([{ editionUuid: "e1", quantity: 2 }], 1), false);
  assert.equal(validPrintingAllocations([{ editionUuid: "e1", quantity: 1 }, { editionUuid: "e1", quantity: 1 }], 3), false);
});
test("moves conserve printing and unspecified copies across sections, including maybeboard", () => {
  assert.equal(selectedMovePrintings(line, 2), null);
  assert.equal(selectedMovePrintings(line, 2, []), null);
  const moved = editDeck(deck, { type: "move", section: "main", destination: "maybeboard", name: "Card", quantity: 2, printings: [{ editionUuid: "e1", quantity: 1 }] }, catalog);
  assert.deepEqual(moved.main[0], { ...line, quantity: 2, printings: [{ editionUuid: "e1", quantity: 1 }, { editionUuid: "e2", quantity: 1 }] });
  assert.deepEqual(moved.maybeboard[0], { card: "Card", quantity: 2, printings: [{ editionUuid: "e1", quantity: 1 }] });
  const restored = editDeck(moved, { type: "move", section: "maybeboard", destination: "main", name: "Card", quantity: 2 }, catalog);
  assert.deepEqual(restored, deck);
  assert.deepEqual(deck.main[0], line);
});
test("increasing keeps choices, ambiguous reductions require a selection", () => {
  assert.deepEqual(editDeck(deck, { type: "quantity", section: "main", name: "Card", quantity: 5 }, catalog).main[0].printings, line.printings);
  assert.equal(editDeck(deck, { type: "quantity", section: "main", name: "Card", quantity: 2 }, catalog), deck);
  assert.equal(editDeck(deck, { type: "quantity", section: "main", name: "Card", quantity: 2, printings: [{ editionUuid: "e2", quantity: 1 }] }, catalog).main[0].quantity, 2);
});
test("collection batches never split a card's reassignment across transactions", () => {
  const drafts: CollectionDrafts = Object.fromEntries(Array.from({ length: 99 }, (_, i) => [`c${i}`, { cardUuid: `c${i}`, cardName: `C${i}`, quantity: 1 }]));
  drafts.c = { cardUuid: "c", cardName: "Card", quantity: 0 };
  drafts.e = { cardUuid: "c", cardName: "Card", editionUuid: "e1", quantity: 4 };
  const batch = prepareCollectionBatch({ drafts, pending: null }, "request-0000000001").pending!;
  assert.equal(Object.keys(batch.lines).length, 99);
  assert.equal(batch.lines.c, undefined);
  assert.equal(batch.lines.e, undefined);
});
test("shared links and tab-local builder drafts preserve edition metadata", async () => {
  const { createBuilderShareParams, parseBuilderShareParams, saveBuilderSession, loadBuilderSession } = await import("../src/features/deckbuilder/persistence/builderPersistence");
  const { loadBuilderSessionSeed } = await import("../src/features/deckbuilder/persistence/builderSeed");
  const selection = { format: "STANDARD" as const, championName: null, spiritName: null, archetypeId: null, populationSource: "balanced" as const, pillarBias: null, championLevelCap: null, collectionMode: "all" as const, lockedCards: [{ name: "Card", quantity: 4, section: "main" as const }], maybeboard: [], rejectedCards: [], printings: extractDeckPrintings(deck) };
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  assert.deepEqual(parseBuilderShareParams(createBuilderShareParams(selection))?.printings, selection.printings);
  assert.equal(saveBuilderSession(storage, { selection, changeLog: [] }), true);
  assert.deepEqual(loadBuilderSession(storage)?.selection.printings, selection.printings);
  assert.deepEqual(loadBuilderSessionSeed(storage as unknown as Storage)?.printings, selection.printings);
});
