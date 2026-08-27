import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { classifyDeckFormat } from "./format.js";

const summary: ShoutAtYourDecksDeckSummary = {
  id: "deck", url: "https://example.test", title: "Deck", author: "Player", champion: "silvie",
  priceLow: null, materialCount: 1, mainCount: 60, sideCount: 0, fetchedAt: "2026-01-01T00:00:00Z",
};
const deck = (quantities: number[]): ShoutAtYourDecksDeck => ({
  ...summary,
  mainDeck: quantities.map((quantity, i) => ({ name: `Card ${i}`, quantity })),
  materialDeck: [{ name: "Champion", quantity: 1 }],
  sideDeck: [],
});

describe("classifyDeckFormat", () => {
  it("preserves a declared source format", () => {
    assert.deepEqual(classifyDeckFormat({ ...summary, format: "PANTHEON", formatConfidence: "declared" }, deck([4])), { format: "PANTHEON", formatConfidence: "declared" });
  });
  it("infers Pantheon only for complete singleton lists", () => {
    assert.deepEqual(classifyDeckFormat(summary, deck(Array(60).fill(1))), { format: "PANTHEON", formatConfidence: "inferred" });
  });
  it("infers Standard from repeated cards", () => {
    assert.deepEqual(classifyDeckFormat(summary, deck([4, 4, 4])), { format: "STANDARD", formatConfidence: "inferred" });
  });
  it("leaves summary-only legacy records unknown", () => {
    assert.deepEqual(classifyDeckFormat(summary), { format: "UNKNOWN", formatConfidence: "unknown" });
  });
});
