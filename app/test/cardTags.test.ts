import assert from "node:assert/strict";
import test from "node:test";
import { canonicalCardTag, cardTagCategory, normalizeCardTags, type CardTagsData } from "@gatcg/shared";
import { buildCardTagLookup } from "@gatcg/shared";

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

test("local corrections preserve other printings, rebuild counts and leave imports intact", async () => {
  const { mergeTagOverrides } = await import("@gatcg/shared");
  const source: CardTagsData = { generatedAt: "test", source: "silvie.gg", sourceUrl: "https://silvie.gg/tagger", tags: [{ name: "Lorraine", cardCount: 1, status: "approved" }], cards: { a: [0] }, editions: { a1: [0], a2: [0] } };
  const catalog = [{ uuid: "a", editions: [{ uuid: "a1" }, { uuid: "a2" }] }];
  const remove = { cardUuid: "a", editionUuid: "a1", tag: "Lorraine Allard", action: "remove" as const };
  const one = buildCardTagLookup(mergeTagOverrides(source, [remove], catalog));
  assert.equal(one.editions.get("a1")?.size, 0);
  assert.equal(one.cards.get("a")?.has("Lorraine Allard"), true);
  const all = mergeTagOverrides(source, [remove, { ...remove, editionUuid: "a2" }], catalog);
  assert.equal(all.tags[0].cardCount, 0);
  assert.deepEqual(source.editions.a1, [0]);
  const gameplay = buildCardTagLookup(mergeTagOverrides(source, [{ cardUuid: "a", editionUuid: null, tag: "Mill", action: "add" }], catalog));
  assert.equal(gameplay.editions.get("a1")?.has("Mill"), true);
  assert.equal(gameplay.editions.get("a2")?.has("Mill"), true);
  assert.equal(gameplay.cards.get("a")?.has("Mill"), true);
});
