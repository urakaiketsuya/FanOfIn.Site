import assert from "node:assert/strict";
import test from "node:test";
import type { OmnidexDecklistEntry } from "@gatcg/shared";
import { eventDeckSearchParams, nextEventDeckSearchIndex, resolveEventDeckSelection } from "../src/features/events/eventDeckSelection.js";

const emptyDecklist = { main: [], material: [], sideboard: [] };
const decks: OmnidexDecklistEntry[] = [
  { player: 20, decklist: emptyDecklist },
  { player: 30, decklist: emptyDecklist },
];

test("direct player links resolve deck preview and every derived action from one selection", () => {
  const selected = resolveEventDeckSelection(77, decks, "30");
  assert.equal(selected?.player, 30);
  assert.equal(selected?.deck, decks[1]);
  assert.equal(selected?.deckId, "77:30");
});

test("missing and invalid direct-link players fall back to the first ranked deck", () => {
  assert.equal(resolveEventDeckSelection(77, decks, null)?.player, 20);
  assert.equal(resolveEventDeckSelection(77, decks, "999")?.player, 20);
  assert.equal(resolveEventDeckSelection(77, [], "30"), null);
});

test("pointer or keyboard player changes preserve other query state and create a canonical URL", () => {
  const next = eventDeckSearchParams(new URLSearchParams("tab=standings&player=20&round=4"), 30);
  assert.equal(next.toString(), "tab=decklists&player=30&round=4");
  assert.equal(resolveEventDeckSelection(77, decks, next.get("player"))?.deckId, "77:30");
});

test("browser history query snapshots restore the matching player selection", () => {
  const back = new URLSearchParams("tab=decklists&player=20");
  const forward = eventDeckSearchParams(back, 30);
  assert.equal(resolveEventDeckSelection(77, decks, back.get("player"))?.player, 20);
  assert.equal(resolveEventDeckSelection(77, decks, forward.get("player"))?.player, 30);
});

test("keyboard navigation wraps through player results", () => {
  assert.equal(nextEventDeckSearchIndex(-1, 2, 1), 0);
  assert.equal(nextEventDeckSearchIndex(0, 2, 1), 1);
  assert.equal(nextEventDeckSearchIndex(1, 2, 1), 0);
  assert.equal(nextEventDeckSearchIndex(0, 2, -1), 1);
  assert.equal(nextEventDeckSearchIndex(-1, 0, 1), -1);
});
