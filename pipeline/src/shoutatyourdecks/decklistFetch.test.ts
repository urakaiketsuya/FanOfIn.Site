import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOmnidexExportText } from "./decklistFetch.js";

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
