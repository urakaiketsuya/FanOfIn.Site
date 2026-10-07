import { test } from "node:test";
import assert from "node:assert/strict";
import type { ShoutAtYourDecksDeck } from "@gatcg/shared";
import { computeCommunityCardStaples, type CommunityStapleInput } from "./communityCardStaples.js";
import { buildCardIndex, type CardSignature } from "../cards/catalog.js";
const catalog = buildCardIndex([{
  name: "Alice, Champion", slug: "alice-champion", types: ["CHAMPION"], classes: [], subtypes: [], elements: ["WATER"], level: 2, editions: [], effect: null,
}, { name: "Shared", slug: "shared", types: ["ACTION"], classes: [], subtypes: [], elements: ["WATER"], level: null, editions: [], effect: null }] satisfies CardSignature[]);
const deck = (id: string, patch: Partial<ShoutAtYourDecksDeck> = {}): ShoutAtYourDecksDeck => ({
  id, url: `https://example.com/${id}`, title: "A deck", author: "", champion: "wrong-source-name", priceLow: null,
  mainCount: 60, materialCount: 1, sideCount: 0, fetchedAt: "2026-10-01", format: "STANDARD",
  mainDeck: [{ name: "Shared", quantity: 3 }], materialDeck: [{ name: "Alice, Champion", quantity: 1 }], sideDeck: [], ...patch,
});
const input = (value: ShoutAtYourDecksDeck, source: CommunityStapleInput["source"] = "shoutatyourdecks"): CommunityStapleInput => ({ source, deck: value });
const overall = (inputs: CommunityStapleInput[]) => computeCommunityCardStaples(inputs, catalog).cohorts.find(c => c.format === null && c.champion === null)!;
test("cross-source copies merge canonical names, split lines, and reordered cards", () => {
  const data = computeCommunityCardStaples([input(deck("a")), input(deck("b", { mainDeck: [{ name: "shared", quantity: 1 }, { name: "Shared", quantity: 2 }] }), "sleeved"), input(deck("c"), "tcgarchitect")], catalog);
  assert.equal(data.cohorts[0].decks, 1);
  assert.deepEqual(data.cohorts[0].sections.main.rows[0].slice(1), [1, 3, 3, 0, null]);
  assert.equal(data.throughDate, null);
  assert.ok(data.cohorts.every(c => c.period === "all"));
  assert.ok(data.cohorts.some(c => c.champion === "Alice"));
});
test("newest source/id wins while IDs from different sources remain independent", () => {
  const newer = deck("a", { fetchedAt: "2026-10-02", mainDeck: [{ name: "Shared", quantity: 4 }] });
  assert.equal(overall([input(deck("a")), input(newer)]).sections.main.rows[0][2], 4);
  assert.equal(overall([input(deck("a")), input(newer, "sleeved")]).decks, 2);
});
test("sideboard variants and absent sections retain coverage without inventing outcomes", () => {
  const missing = deck("missing"); delete (missing as Partial<ShoutAtYourDecksDeck>).sideDeck;
  const stats = overall([input(deck("empty")), input(missing), input(deck("side", { sideDeck: [{ name: "Shared", quantity: 2 }] }))]);
  assert.equal(stats.decks, 3); assert.equal(stats.sections.sideboard.decks, 2);
  assert.deepEqual(stats.sections.sideboard.rows[0].slice(1), [1, 2, 2, 0, null]);
});
test("format and boon choices remain distinct; incomplete lists cannot dilute counts", () => {
  const stats = overall([input(deck("standard")), input(deck("pantheon", { format: "PANTHEON" })), input(deck("boon", { format: "PANTHEON", pantheonDeck: [{ name: "Boon", quantity: 1 }] })), input(deck("empty", { mainDeck: [] }))]);
  assert.equal(stats.decks, 3);
  assert.equal(computeCommunityCardStaples([], catalog).cohorts.length, 0);
});
