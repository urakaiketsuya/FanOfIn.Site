import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { emptyFilterState, filterCards } from "../src/features/cards/filters";
const cards = ["ALC", "ALC 1st", "ALC Alter", "ALCSD", "P24"].map(prefix => ({ name: prefix, editions: [{ set: { prefix } }] })) as Card[];
test("family filtering includes editions and supports existing edition links", () => {
 for (const prefix of ["ALC", "ALC 1st", "ALC Alter"]) {
  assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set([prefix]) }).length, 3);
 }
 assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALCSD"]) }).length, 1);
});
test("optional printing filter narrows family results and clearing restores all cards", () => {
 assert.deepEqual(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALC"]), printingSets: new Set(["ALC 1st"]) }).map(card => card.name), ["ALC 1st"]);
 assert.equal(filterCards(cards, { ...emptyFilterState(), sets: new Set(["ALC"]), printingSets: new Set(["P24"]) }).length, 0);
 assert.equal(filterCards(cards, emptyFilterState()).length, 5);
});
