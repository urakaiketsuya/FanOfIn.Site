import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DeckReadinessSummary from "../src/features/collection/DeckReadinessSummary";
const complete = { required: 6, owned: 6, available: 6, missing: 0, blocked: 0, move: 0, unresolved: 0, reconcile: false, lines: [] };
const render = (summary = complete, availabilityKnown = true) => renderToStaticMarkup(createElement(DeckReadinessSummary, { summary, availabilityKnown }));
test("completion requires verified coverage without unresolved cards or reconciliation", () => {
  assert.match(render(), /All required copies are recorded/);
  assert.doesNotMatch(render(complete, false), /All required copies are recorded/);
  assert.doesNotMatch(render({ ...complete, unresolved: 1 }), /All required copies are recorded/);
  assert.doesNotMatch(render({ ...complete, reconcile: true }), /All required copies are recorded/);
  assert.equal(render({ ...complete, required: 0 }), "");
});
test("ownership completion explains loans and transfers without claiming physical readiness", () => {
  assert.match(render({ ...complete, blocked: 1, available: 5 }), /Review the loans and reservations/);
  assert.match(render({ ...complete, move: 2 }), /moving the copies assigned to other decks/);
  assert.match(render(complete, false), /Availability is not verified/);
});
