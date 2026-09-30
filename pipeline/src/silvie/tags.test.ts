import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCardTags, refreshWithSavedTags } from "./tags.js";

const CATALOG = [
  { uuid: "cardA", editions: [{ uuid: "edA1" }, { uuid: "edA2" }] },
  { uuid: "cardB", editions: [{ uuid: "edB1" }] },
] as Parameters<typeof buildCardTags>[2];

describe("buildCardTags", () => {
  it("maps printings to cards, drops identity fields, and ranks tags by card count", () => {
    const data = buildCardTags(
      [
        { id: "cardA-edA1", editionId: "edA1", tagger_cardtag: [{ tagId: "Diana" }, { tagId: "bird" }] },
        { id: "cardA-edA2", editionId: "edA2", tagger_cardtag: [{ tagId: "bird" }] },
        { id: "cardB-edB1", editionId: "edB1", tagger_cardtag: [{ tagId: "bird" }] },
        { id: "cardB-edNEW", editionId: "edNEW", tagger_cardtag: [{ tagId: "Mill" }] },
        { id: "cardZ-edZ", editionId: "edZ", tagger_cardtag: [{ tagId: "Ghost" }] },
      ],
      [{ name: "Diana", status: "approved" }, { name: "bird", status: "weird" }],
      CATALOG,
      "2026-01-01T00:00:00.000Z",
    );
    assert.deepEqual(data.tags, [
      { name: "bird", cardCount: 2, status: "pending" },
      { name: "Diana", cardCount: 1, status: "approved" },
      { name: "Mill", cardCount: 1, status: "pending" },
    ]);
    assert.deepEqual(data.editions, { edA1: [0, 1], edA2: [0], edB1: [0] });
    assert.deepEqual(data.cards, { cardA: [0, 1], cardB: [0, 2] });
    assert.equal(JSON.stringify(data).includes("user"), false);
  });
});


describe("refreshWithSavedTags", () => {
  const saved = buildCardTags(
    [{ id: "cardA-edA1", editionId: "edA1", tagger_cardtag: [{ tagId: "bird" }] }],
    [{ name: "bird", status: "approved" }], CATALOG, "2026-01-01T00:00:00.000Z",
  );
  const forbidden = async () => { throw new Error("403 Forbidden"); };

  it("preserves a valid snapshot and reports its age when upstream denies access", async () => {
    const warnings: string[] = [];
    assert.equal(await refreshWithSavedTags(forbidden, async () => JSON.stringify(saved), message => warnings.push(message)), null);
    assert.match(warnings[0], /2026-01-01.*403 Forbidden/);
  });

  it("returns fresh data without reading a fallback", async () => {
    assert.equal(await refreshWithSavedTags(async () => saved, async () => { throw new Error("must not read"); }), saved);
  });

  it("fails when the snapshot is missing, malformed, empty, or has broken tag references", async () => {
    await assert.rejects(refreshWithSavedTags(forbidden, async () => { throw new Error("ENOENT"); }), /ENOENT/);
    for (const value of ["{", "null", JSON.stringify({ ...saved, tags: [] }), JSON.stringify({ ...saved, cards: { cardA: [99] } })]) {
      await assert.rejects(refreshWithSavedTags(forbidden, async () => value));
    }
  });
});
