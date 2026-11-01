import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { emptyFilterState, filterCards } from "../src/features/cards/filters";
const cards = ["ALC", "ALC 1st", "ALC Alter", "ALCSD", "P24"].map(prefix => ({ name: prefix, editions: [{ set: { prefix } }] })) as Card[];
test("family filtering includes editions and supports existing edition links", () => {
 for (const prefix of ["ALC", "ALC 1st", "ALC Alter"]) {
  assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set([prefix]) }).length, 4);
 }
 assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALCSD"]) }).length, 4);
});
test("optional printing filter narrows family results and clearing restores all cards", () => {
 assert.deepEqual(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALC"]), printingSets: new Set(["ALC 1st"]) }).map(card => card.name), ["ALC 1st"]);
 assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALC"]), printingSets: new Set(["P24"]) }).length, 0);
 assert.equal(filterCards(cards, emptyFilterState()).length, 5);
});

 test("search groups product variants without changing printing identities", async () => {
  const { searchSetPrefix, setFamilyPrefix } = await import("@gatcg/shared");
  const { catalogSetOptions } = await import("../src/lib/previewCards");
  const { deckMatchesContentFilters, deckContentRelevance, emptyDeckContentFilters } = await import("../src/features/decks/deckContentFilters");
  const prefixes = ["PRD", "PRD 1st", "PRDSD", "PRDEVP", "PRDDP", "PRDG", "PRDP"];
  const pool = prefixes.map(prefix => ({ uuid: prefix, name: prefix, editions: [{set: {prefix, name: prefix}}] })) as Card[];
  assert.deepEqual(catalogSetOptions(pool), [{value: "PRD", text: ".asphodel/paradise"}]);
  for (const prefix of prefixes) assert.equal(searchSetPrefix(prefix.toLowerCase()), "PRD");
  assert.equal(setFamilyPrefix("PRDSD"), "PRDSD");
  assert.equal(filterCards(pool, {...emptyFilterState(), sets: new Set(["PRD"])}).length, pool.length);
  assert.equal(filterCards(pool, {...emptyFilterState(), sets: new Set(["-PRD"])}).length, 0);
  const filters = {...emptyDeckContentFilters(), sets: new Set(["PRD"])};
  const index = new Map(pool.map(card => [card.name, card]));
  const lines = [{name: "PRDSD", quantity: 4}];
  assert.equal(deckMatchesContentFilters(lines, filters, index), true);
  assert.equal(deckContentRelevance(lines, filters, index), 1);
 });
