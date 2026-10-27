import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComparison, readBrowseComparison } from "../src/features/decks/browseComparisonModel";
import { buildPopularDeck } from "../src/features/popular/popularityAggregation";

test("build selection preserves exact Main and Material copies without choosing a player's sideboard", () => {
  const main = [{ name: "Veiling Breeze", quantity: 4 }];
  const material = [{ name: "Spirit of Wind", quantity: 1 }];
  const build = buildPopularDeck(main, material, "Lorraine", ["1:2"], [], new Map());
  const selected = buildComparison(build);
  assert.equal(selected.source.kind, "custom");
  if (selected.source.kind !== "custom") throw new Error("Expected custom list");
  assert.deepEqual(selected.source.decklist, { main: [{ card: "Veiling Breeze", quantity: 4 }], material: [{ card: "Spirit of Wind", quantity: 1 }], sideboard: [] });
  assert.match(selected.label, /Main \+ Material/);
  assert.deepEqual(readBrowseComparison(JSON.parse(JSON.stringify([selected]))), [selected]);
});

test("stored mixed selections retain order, distinguish sources and discard duplicates and corrupt drafts", () => {
  const sighting = { key: "1:2", label: "Tournament deck", source: { kind: "sighting", eventId: 1, player: 2 } };
  const shared = { key: "public:1:2", label: "Shared deck", source: { kind: "public", slug: "1:2" } };
  const custom = { key: "build:example", label: "Build", source: { kind: "custom", decklist: { main: [{ card: "A", quantity: 4 }], material: [], sideboard: [] } } };
  assert.deepEqual(readBrowseComparison([shared, sighting, custom, shared, null, {}, { ...sighting, key: "bad", source: { kind: "sighting", eventId: -1, player: 2 } }, { ...custom, key: "bad-list", source: { kind: "custom", decklist: { main: [{ card: "A", quantity: -4 }], material: [], sideboard: [] } } }]), [shared, sighting, custom]);
  assert.deepEqual(readBrowseComparison("broken"), []);
});
