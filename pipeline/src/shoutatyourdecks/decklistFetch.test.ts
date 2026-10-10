import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { needsDecklistRefresh, parseOmnidexExportText } from "./decklistFetch.js";

describe("parseOmnidexExportText", () => {
  it("preserves Pantheon boon cards in their own zone", () => {
    const parsed = parseOmnidexExportText(`# Material Deck
1 Spirit of Fire

# Pantheon
1 Greater Boon of Parvati
1 Lesser Boon of Vritra

# Main Deck
1 Academy Guide`);

    assert.deepEqual(parsed.pantheonDeck, [
      { quantity: 1, name: "Greater Boon of Parvati" },
      { quantity: 1, name: "Lesser Boon of Vritra" },
    ]);
    assert.deepEqual(parsed.materialDeck, [{ quantity: 1, name: "Spirit of Fire" }]);
    assert.deepEqual(parsed.mainDeck, [{ quantity: 1, name: "Academy Guide" }]);
  });
});

const summary: ShoutAtYourDecksDeckSummary = {
  id: "legacy", url: "https://example.test/deck", title: "Deck", author: "Player", champion: "silvie",
  priceLow: null, materialCount: 1, mainCount: 60, sideCount: 0, fetchedAt: "2026-01-01T00:00:00Z",
};
const legacy: ShoutAtYourDecksDeck = {
  ...summary, mainDeck: Array.from({ length: 60 }, (_, i) => ({ name: `Card ${i}`, quantity: 1 })),
  materialDeck: [{ name: "Champion", quantity: 1 }], sideDeck: [],
};

describe("Pantheon scrape completeness", () => {
  it("fetches new lists and legacy inferred or declared Pantheon lists missing boons", () => {
    assert.equal(needsDecklistRefresh(summary, null), true);
    assert.equal(needsDecklistRefresh(summary, legacy), true);
    assert.equal(needsDecklistRefresh({ ...summary, format: "PANTHEON" }, legacy), true);
  });
  it("does not refetch checked empty sections or complete boon sections", () => {
    assert.equal(needsDecklistRefresh(summary, { ...legacy, pantheonDeck: [] }), false);
    assert.equal(needsDecklistRefresh(summary, { ...legacy, pantheonDeck: [{ name: "Greater Boon of Parvati", quantity: 1 }] }), false);
    assert.equal(needsDecklistRefresh({ ...summary, format: "STANDARD" }, legacy), false);
  });
  it("records a checked empty section for a complete export without boons", () => {
    const parsed = parseOmnidexExportText("# Material Deck\n1 Champion\n# Main Deck\n1 Card");
    assert.deepEqual(parsed.pantheonDeck, []);
    assert.equal(needsDecklistRefresh(summary, { ...legacy, ...parsed }), false);
  });
  it("rejects blank or incomplete exports instead of recording false completeness", () => {
    for (const text of ["", "# Pantheon\n1 Greater Boon of Parvati", "# Main Deck\n1 Card"]) {
      assert.throws(() => parseOmnidexExportText(text), /Incomplete deck export/);
    }
  });
});
