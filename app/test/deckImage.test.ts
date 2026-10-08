import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { deckImageSections } from "../src/lib/deckImage";

const card = { name: "Example", editions: [{ uuid: "default", image: "/default.jpg" }, { uuid: "alternate", image: "/alternate.jpg" }] } as Card;
const cards = new Map([[card.name, card]]);
test("image export preserves section totals, mixed printings, and unspecified copies", () => {
  const sections = [{ title: "Main", lines: [{ card: "Example", quantity: 4, printings: [{ editionUuid: "alternate", quantity: 2 }] }] }, { title: "Sideboard", lines: [{ card: "Example", quantity: 1 }] }];
  const before = JSON.stringify(sections);
  assert.deepEqual(deckImageSections(sections, cards), [
    { title: "Main", total: 4, tiles: [{ name: "Example", quantity: 2, image: "/alternate.jpg" }, { name: "Example", quantity: 2, image: "/default.jpg" }] },
    { title: "Sideboard", total: 1, tiles: [{ name: "Example", quantity: 1, image: "/default.jpg" }] },
  ]);
  assert.equal(JSON.stringify(sections), before);
});
test("unavailable cards and selected printings keep names and quantities instead of substituting artwork", () => {
  const groups = deckImageSections([{ title: "Material", lines: [{ card: "Unknown", quantity: 2 }, { card: "Example", quantity: 1, printings: [{ editionUuid: "missing", quantity: 1 }] }] }, { title: "Main", lines: [] }], cards);
  assert.deepEqual(groups, [{ title: "Material", total: 3, tiles: [{ name: "Unknown", quantity: 2, image: undefined }, { name: "Example", quantity: 1, image: undefined }] }]);
  assert.deepEqual(deckImageSections([], cards), []);
});
