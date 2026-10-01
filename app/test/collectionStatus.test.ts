import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cardLocationState, computeDeckCollectionStatus, type CollectionCardTracking } from "@gatcg/shared";
import { CollectionCopyStatus } from "../src/features/collection/CollectionStatus";

const entries = [{ cardUuid: "c", cardName: "Card", ownedQuantity: 4, proxyQuantity: 2, updatedAt: "" }];
const record: CollectionCardTracking = { cardUuid: "c", cardName: "Card", mightOwn: false, assignments: [{ deckId: "a", quantity: 1 }], loans: [{ id: "l", borrower: "Player", quantity: 2, lentAt: "2026-09-01" }], tradeReservedQuantity: 1, revision: 1, updatedAt: "" };
function count(html: string, label: string, value: number) {
  assert.match(html, new RegExp(`<dt[^>]*>${label}</dt><dd[^>]*>${value}</dd>`));
}
test("complete ownership does not imply all copies are available for play", () => {
  assert.equal(computeDeckCollectionStatus({ main: [{ card: "Card", quantity: 4 }], material: [], sideboard: [] }, entries, true).complete, true);
  const html = renderToStaticMarkup(createElement(CollectionCopyStatus, { state: cardLocationState("c", entries, record) }));
  count(html, "Owned", 4); count(html, "Available to use", 1); count(html, "Assigned to decks", 1);
  count(html, "Unassigned", 0); count(html, "Lent to players", 2); count(html, "Reserved for trades", 1);
});
test("returning a loan restores availability without changing ownership", () => {
  const returned = { ...record, loans: record.loans.map(loan => ({ ...loan, returnedAt: "2026-09-02" })) };
  const html = renderToStaticMarkup(createElement(CollectionCopyStatus, { state: cardLocationState("c", entries, returned) }));
  count(html, "Owned", 4); count(html, "Available to use", 3); count(html, "Lent to players", 0); count(html, "Unassigned", 2);
});
test("unknown inventory is zero and overassignment is visible", () => {
  const html = renderToStaticMarkup(createElement(CollectionCopyStatus, { state: cardLocationState("c", [], record) }));
  count(html, "Owned", 0); count(html, "Available to use", 0);
  assert.match(html, /exceed owned copies by 4/);
});
