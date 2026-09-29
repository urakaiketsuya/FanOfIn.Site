import { test } from "node:test";
import assert from "node:assert/strict";
import { cardLegalityStatus, deckCardIssues, newlyAddedBannedCards, type Card, type OmnidexDecklist } from "@gatcg/shared";
import { validateDeck } from "../src/features/deckbuilder/validateDeck.ts";
const card = { name: "Restricted card", types: ["ALLY"], subtypes: [], elements: ["NORM"], legality: { STANDARD: { limit: 0 }, PANTHEON: { limit: 1 } } } as unknown as Card;
const catalog = new Map([[card.name, card]]);
const empty = (): OmnidexDecklist => ({ main: [], material: [], sideboard: [] });
test("bans are format specific and include every active section, not maybeboard", () => {
  const deck = { main: [{ card: card.name, quantity: 2 }], material: [], sideboard: [{ card: card.name, quantity: 1 }], maybeboard: [{ card: card.name, quantity: 4 }] };
  const issues = deckCardIssues(deck, catalog, "STANDARD");
  assert.deepEqual(issues.map(issue => [issue.code, issue.section, issue.quantity]), [["banned", "main", 2], ["banned", "sideboard", 1]]);
  assert.deepEqual(deckCardIssues(deck, catalog, "PANTHEON"), []);
  assert.equal(cardLegalityStatus(card, "UNKNOWN"), "unverified");
  assert.equal(cardLegalityStatus(undefined, "STANDARD"), "unverified");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "STANDARD"), "allowed");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "PANTHEON"), "allowed");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "UNKNOWN"), "unverified");
  assert.equal(cardLegalityStatus({ ...card, legality: {} }, "STANDARD"), "unverified");
});
test("null legality records do not produce deck warnings", () => {
  const unrestricted = { ...card, legality: null };
  const deck = { main: [{ card: card.name, quantity: 4 }], material: [], sideboard: [] };
  assert.deepEqual(deckCardIssues(deck, new Map([[card.name, unrestricted]]), "STANDARD"), []);
});
test("warnings fire for additions but not section moves, removals or unchanged loads", () => {
  const deck = { ...empty(), main: [{ card: card.name, quantity: 2 }] };
  assert.deepEqual(newlyAddedBannedCards(empty(), deck, catalog, "STANDARD"), [card.name]);
  assert.deepEqual(newlyAddedBannedCards(deck, deck, catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(deck, { ...empty(), sideboard: deck.main }, catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(deck, empty(), catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(empty(), deck, catalog, "PANTHEON"), []);
});
test("validator exposes structured bans and does not certify unknown formats", () => {
  const input = { main: [{ cardName: card.name, quantity: 1 }], material: [], sideboard: [] };
  const result = validateDeck(input, catalog, new Set(), "STANDARD");
  assert.equal(result.status, "Illegal");
  assert.equal(result.cardIssues[0].code, "banned");
  assert.ok(result.reasons.some(reason => reason.includes("banned in Standard")));
  assert.equal(validateDeck(input, catalog, new Set(), "UNKNOWN").cardIssues[0].code, "unverified");
});
