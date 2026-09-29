import assert from "node:assert/strict";
import test from "node:test";
import { canonicalCardTag, cardTagCategory, normalizeCardTags, type CardTagsData } from "@gatcg/shared";
import { buildCardTagLookup } from "../src/features/cards/cardTags";

test("aliases merge distinct cards while preserving edition attribution and conservative moderation", () => {
  const raw: CardTagsData = { generatedAt: "test", source: "silvie.gg", sourceUrl: "https://silvie.gg/tagger", tags: [
    { name: "Lorraine", cardCount: 2, status: "approved" },
    { name: "Lorraine Allard", cardCount: 1, status: "pending" },
    { name: "-1  Influence", cardCount: 1, status: "review" },
  ], cards: { a: [0, 1], b: [0], c: [2] }, editions: { first: [0], second: [1], third: [2] } };
  const normalized = normalizeCardTags(raw);
  assert.deepEqual(normalized.tags[0], { name: "Lorraine Allard", cardCount: 2, status: "pending" });
  const lookup = buildCardTagLookup(normalized);
  assert.deepEqual([...lookup.editions.get("first")!], ["Lorraine Allard"]);
  assert.deepEqual([...lookup.editions.get("third")!], ["-1 Influence"]);
  assert.equal(raw.tags[0].name, "Lorraine");
  assert.equal(canonicalCardTag(" rai "), "Rai Kyouki");
});

test("ambiguous tags remain unclassified instead of implying a mechanic", () => {
  assert.equal(cardTagCategory("Lorraine"), "Characters");
  assert.equal(cardTagCategory("-1  Influence"), "Gameplay");
  assert.equal(cardTagCategory("Mill"), "Gameplay");
  assert.equal(cardTagCategory("bird"), "Art & themes");
  assert.equal(cardTagCategory("Fire"), "Other");
  assert.equal(cardTagCategory("An unknown future tag"), "Other");
});
