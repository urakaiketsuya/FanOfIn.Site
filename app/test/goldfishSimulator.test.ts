import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { banishRandomFromMemory, beginRecollection, createTokens, goldfishEffectSupport, isReplayableHistory, materializeCard, newGame, nextTurn, parseGoldfishSession, playCard, recollectMemory, removeToken, replayGoldfishHistory, reserveCard, resolveGlimpse, serializeGoldfishSession, suggestedGlimpse, type GoldfishState } from "../src/lib/goldfishSimulator";

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
  const materialized = materializeCard(nextTurn(recollected, false), recollected.materialDeck[0].id);
  assert.equal(materialized.materialized[0].name, "Champion");
  assert.equal(materialized.library.length, 0);
});

test("tokens have explicit identities and can coexist", () => {
  const state = createTokens(newGame({ main: [], material: [], sideboard: [] }, 0, 9), "Powercell", 2, true);
  assert.equal(state.tokens.length, 2);
  assert.equal(state.tokens.every((token) => token.rested), true);
  assert.notEqual(state.tokens[0].id, state.tokens[1].id);
});

test("Main Deck and Material Deck actions are blocked during Recollection", () => {
  const state = newGame({ main: [{ card: "Main card", quantity: 2 }], material: [{ card: "Material card", quantity: 1 }], sideboard: [] }, 2, 11);
  const recollection = beginRecollection(state);
  assert.equal(playCard(recollection, recollection.hand[0].id), recollection);
  assert.equal(reserveCard(recollection, recollection.hand[0].id), recollection);
  assert.equal(materializeCard(recollection, recollection.materialDeck[0].id), recollection);
});

test("effect support recognizes only bounded deterministic assists", () => {
  const supported = goldfishEffectSupport(card("Draw 2 cards. Glimpse 3. Summon two Powercell tokens. Banish a card at random from your memory."));
  // Word quantities beyond one are deliberately not inferred.
  assert.deepEqual(supported.assists, [
    { type: "draw", count: 2 },
    { type: "glimpse", count: 3 },
    { type: "banish-random-memory", count: 1 },
  ]);
  assert.equal(supported.hasUnsupportedText, true);

  assert.deepEqual(goldfishEffectSupport(card("Summon 2 Powercell tokens.")).assists, [
    { type: "create-tokens", name: "Powercell", count: 2 },
  ]);
  assert.equal(goldfishEffectSupport(card("If you control an ally, draw 1 card.")).hasUnsupportedText, true);
  assert.equal(goldfishEffectSupport(card("Reservable")).hasUnsupportedText, false);
});

test("glimpse suggestion recognizes fixed amounts and skips variable additions", () => {
  assert.equal(suggestedGlimpse(card("Glimpse 3. Then draw a card.")), 3);
  assert.equal(suggestedGlimpse(card("Glimpse 2, then Glimpse 4.")), 6);
  assert.equal(suggestedGlimpse(card("Glimpse 1+X.")), 0);
  assert.equal(suggestedGlimpse(card("Glimpse LV.")), 0);
});

test("saved sessions round-trip every modeled zone and deterministic RNG state", () => {
  const decklist = { main: ["A", "B", "C", "D"].map((name) => ({ card: name, quantity: 1 })), material: [{ card: "Champion", quantity: 1 }], sideboard: [] };
  let state = newGame(decklist, 4, 42);
  state = state.hand.reduce((current, entry) => reserveCard(current, entry.id), state);
  state = createTokens(state, "Powercell", 2, true);
  state = materializeCard(state, state.materialDeck[0].id);
  const restored = parseGoldfishSession(serializeGoldfishSession(decklist, 7, state));
  assert.ok(restored);
  assert.deepEqual(restored.decklist, decklist);
  assert.deepEqual(restored.state, state);
  assert.equal(restored.handSize, 7);
  assert.deepEqual(banishRandomFromMemory(restored.state, 2), banishRandomFromMemory(state, 2));
});

test("structured actions replay the full position from its opening seed", () => {
  const decklist = { main: ["A", "B", "C", "D", "E", "F"].map((name) => ({ card: name, quantity: 1 })), material: [{ card: "Champion", quantity: 1 }], sideboard: [] };
  let state = newGame(decklist, 4, 8675309);
  state = reserveCard(state, state.hand[0].id);
  state = playCard(state, state.hand[0].id);
  state = materializeCard(state, state.materialDeck[0].id);
  state = createTokens(state, "Powercell", 2, true);
  state = removeToken(state, state.tokens[0].id);
  state = banishRandomFromMemory(state, 1);
  state = nextTurn(state);
  state = resolveGlimpse(state, 1, new Set(state.library[0] ? [state.library[0].id] : []));

  assert.equal(isReplayableHistory(state.history), true);
  assert.deepEqual(replayGoldfishHistory(decklist, state.seed, state.history), state);
});

test("older minimal Goldfish sessions migrate new zones with safe defaults", () => {
  const restored = parseGoldfishSession(JSON.stringify({
    version: 1,
    decklist: { main: [{ card: "A", quantity: 1 }], material: [], sideboard: [] },
    state: { version: 1, seed: 12, turn: 2, library: [{ id: "A#0", name: "A" }], hand: [], played: [], history: [] },
  }));
  assert.ok(restored);
  assert.equal(restored.version, 2);
  assert.equal(restored.state.version, 2);
  assert.equal(restored.state.phase, "main");
  assert.deepEqual(restored.state.memory, []);
  assert.deepEqual(restored.state.materialDeck, []);
  assert.deepEqual(restored.state.tokens, []);
  assert.equal(restored.state.rngState, 12);
  assert.equal(isReplayableHistory(restored.state.history), false);
  assert.equal(replayGoldfishHistory(restored.decklist, restored.state.seed, restored.state.history), null);
});

test("malformed Goldfish sessions are rejected", () => {
  assert.equal(parseGoldfishSession("not json"), null);
  assert.equal(parseGoldfishSession(JSON.stringify({ decklist: {}, state: { seed: "nope", turn: 1 } })), null);
});
