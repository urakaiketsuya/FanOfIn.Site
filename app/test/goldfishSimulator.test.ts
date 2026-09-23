import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { banishRandomFromMemory, beginRecollection, createTokens, materializeCard, newGame, recollectMemory, reserveCard, resolveGlimpse, suggestedGlimpse, type GoldfishState } from "../src/lib/goldfishSimulator";

const card = (effect: string): Card => ({ effect } as Card);

test("glimpse keeps selected cards on top and moves the rest below the unseen library", () => {
  const state: GoldfishState = {
    ...newGame({ main: [], material: [], sideboard: [] }, 0, 123),
    library: ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() })),
  };
  const result = resolveGlimpse(state, 3, new Set(["a", "c"]));
  assert.deepEqual(result.library.slice(0, 4).map(({ id }) => id), ["a", "c", "d", "e"]);
  assert.equal(result.library.at(-1)?.id, "b");
  assert.deepEqual(state.library.map(({ id }) => id), ["a", "b", "c", "d", "e"]);
});

test("seeded games and random Memory banishment replay identically", () => {
  const decklist = { main: ["A", "B", "C", "D"].map((card) => ({ card, quantity: 1 })), material: [], sideboard: [] };
  const first = newGame(decklist, 4, 8675309);
  const second = newGame(decklist, 4, 8675309);
  assert.deepEqual(first.hand, second.hand);
  const firstMemory = first.hand.reduce((state, entry) => reserveCard(state, entry.id), first);
  const secondMemory = second.hand.reduce((state, entry) => reserveCard(state, entry.id), second);
  assert.deepEqual(banishRandomFromMemory(firstMemory, 2).banished, banishRandomFromMemory(secondMemory, 2).banished);
});

test("Recollection returns reserved cards and Material cards stay outside the Library", () => {
  const state = newGame({ main: [{ card: "Reservable", quantity: 1 }], material: [{ card: "Champion", quantity: 1 }], sideboard: [] }, 1, 7);
  const reserved = reserveCard(state, state.hand[0].id);
  assert.equal(reserved.memory[0].name, "Reservable");
  const recollected = recollectMemory(beginRecollection(reserved));
  assert.equal(recollected.memory.length, 0);
  assert.equal(recollected.hand[0].name, "Reservable");
  const materialized = materializeCard(recollected, recollected.materialDeck[0].id);
  assert.equal(materialized.materialized[0].name, "Champion");
  assert.equal(materialized.library.length, 0);
});

test("tokens have explicit identities and can coexist", () => {
  const state = createTokens(newGame({ main: [], material: [], sideboard: [] }, 0, 9), "Powercell", 2, true);
  assert.equal(state.tokens.length, 2);
  assert.equal(state.tokens.every((token) => token.rested), true);
  assert.notEqual(state.tokens[0].id, state.tokens[1].id);
});

test("glimpse suggestion recognizes fixed amounts and skips variable additions", () => {
  assert.equal(suggestedGlimpse(card("Glimpse 3. Then draw a card.")), 3);
  assert.equal(suggestedGlimpse(card("Glimpse 2, then Glimpse 4.")), 6);
  assert.equal(suggestedGlimpse(card("Glimpse 1+X.")), 0);
  assert.equal(suggestedGlimpse(card("Glimpse LV.")), 0);
});
