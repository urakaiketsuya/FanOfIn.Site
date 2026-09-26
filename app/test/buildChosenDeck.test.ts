import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { buildChosenDeck } from "../src/features/deckbuilder/engine/buildChosenDeck";
import { buildToDecklist } from "../src/features/deckbuilder/engine/builderSelectors";


test("manual deck and exports contain choices even when recommendation data is loading", () => {
  const result = buildChosenDeck(new Map([["Dungeon Guide", 3], ["Backup", 2]]), new Map([["Backup", "sideboard"]]), null, new Map());
  assert.deepEqual(buildToDecklist(result), {
    main: [{ card: "Dungeon Guide", quantity: 3 }], material: [], sideboard: [{ card: "Backup", quantity: 2 }],
  });
  assert.equal(result.loading, false);
  assert.deepEqual(result.suggestions, []);
});

test("an empty workbench contains no automatic cards", () => {
  const result = buildChosenDeck(new Map(), new Map(), null, new Map());
  assert.deepEqual(buildToDecklist(result), { main: [], material: [], sideboard: [] });
});

test("legacy selected Spirit is included once and catalog material cards are placed correctly", () => {
  const catalog = new Map([["Regalia", { types: ["REGALIA"] } as Card]]);
  const result = buildChosenDeck(new Map([["Spirit of Water", 1], ["Regalia", 1]]), new Map(), "Spirit of Water", catalog);
  assert.deepEqual(result.material.map((card) => card.cardName), ["Spirit of Water", "Regalia"]);
  assert.deepEqual(result.main, []);
});

test("explicit Spirit quantities remain visible for validation rather than being silently corrected", () => {
  const result = buildChosenDeck(new Map([["Spirit of Water", 2]]), new Map(), "Spirit of Water", new Map());
  assert.equal(result.material[0].quantity, 2);
});
