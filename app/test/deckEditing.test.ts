import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { editDeck, type EditableDeck } from "../src/lib/deckEditing.ts";
import { mapsToSelections, selectionsToMaps } from "../src/features/deckbuilder/model/builderTypes.ts";
import { buildChosenDeck } from "../src/features/deckbuilder/engine/buildChosenDeck.ts";
import { createBuilderShareParams, parseBuilderShareParams, saveBuilderSession, loadBuilderSession } from "../src/features/deckbuilder/persistence/builderPersistence.ts";

const catalog = new Map<string, Card>([["Ally", { name: "Ally", types: ["ALLY"] } as Card], ["Spirit", { name: "Spirit", types: ["CHAMPION"], subtypes: ["SPIRIT"] } as Card]]);
const initial = (): EditableDeck => ({ main: [{ card: "Ally", quantity: 4 }], material: [], sideboard: [{ card: "Ally", quantity: 1 }], maybeboard: [] });
test("split moves conserve copies, merge the target and leave the input untouched", () => {
  const before = initial();
  const after = editDeck(before, { type: "move", section: "main", destination: "sideboard", name: "Ally", quantity: 2 }, catalog);
  assert.equal(before.main[0].quantity, 4);
  assert.equal(after.main[0].quantity, 2);
  assert.equal(after.sideboard[0].quantity, 3);
  assert.notEqual(after.sideboard[0], before.sideboard[0]);
});
test("moving all copies removes the source and supports maybeboard round trips", () => {
  const moved = editDeck(initial(), { type: "move", section: "main", destination: "maybeboard", name: "Ally", quantity: 4 }, catalog);
  assert.deepEqual(moved.main, []);
  const returned = editDeck(moved, { type: "move", section: "maybeboard", destination: "main", name: "Ally", quantity: 4 }, catalog);
  assert.deepEqual(returned, initial());
});
test("invalid quantities and incompatible destinations are no-ops", () => {
  const deck = initial();
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 5]) assert.equal(editDeck(deck, { type: "move", section: "main", destination: "sideboard", name: "Ally", quantity }, catalog), deck);
  assert.equal(editDeck(deck, { type: "move", section: "main", destination: "material", name: "Ally", quantity: 1 }, catalog), deck);
  assert.equal(editDeck(deck, { type: "move", section: "main", destination: "main", name: "Ally", quantity: 1 }, catalog), deck);
});
test("draft quantities are not silently truncated and removal is section-specific", () => {
  const changed = editDeck(initial(), { type: "quantity", section: "main", name: "Ally", quantity: 9 }, catalog);
  assert.equal(changed.main[0].quantity, 9);
  const removed = editDeck(changed, { type: "remove", section: "sideboard", name: "Ally" }, catalog);
  assert.equal(removed.main[0].quantity, 9);
  assert.deepEqual(removed.sideboard, []);
  // An undo history can restore the immutable previous snapshot exactly.
  assert.equal(changed.sideboard[0].quantity, 1);
});
test("split builder selections survive maps, assembled deck, share links and sessions", () => {
  const selections = [{ name: "Ally", quantity: 2, section: "main" as const }, { name: "Ally", quantity: 2, section: "sideboard" as const }];
  const mapped = selectionsToMaps([...selections].reverse());
  assert.deepEqual(mapsToSelections(mapped.cards, mapped.sections), selections);
  const built = buildChosenDeck(mapped.cards, mapped.sections, null, catalog);
  assert.equal(built.main[0].quantity, 2); assert.equal(built.sideboard[0].quantity, 2);
  assert.equal(built.sideboard[0].cardName, "Ally");
  const params = createBuilderShareParams({ championName: null, spiritName: null, archetypeId: null, format: "STANDARD", lockedCards: selections });
  assert.deepEqual(parseBuilderShareParams(params)?.lockedCards, selections);
  const storage = new Map<string, string>();
  const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } };
  saveBuilderSession(adapter, { selection: { format: "STANDARD", championName: null, spiritName: null, archetypeId: null, populationSource: "balanced", pillarBias: null, championLevelCap: null, collectionMode: "all", lockedCards: selections, rejectedCards: [], maybeboard: [] }, changeLog: [] });
  assert.deepEqual(loadBuilderSession(adapter)?.selection.lockedCards, selections);
});
