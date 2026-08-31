import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TcgArchitectApiCard, TcgArchitectApiDeck } from "./client.js";
import { transformTcgArchitectDeck } from "./transform.js";

function card(overrides: Partial<TcgArchitectApiCard> & { name: string; id: string; deckType: string; quantity?: number }): TcgArchitectApiCard {
  const { deckType, quantity, ...rest } = overrides;
  return {
    types: [],
    level: null,
    pivot: { deck_id: "abc-123", card_id: overrides.id, quantity: quantity ?? 1, deck_type: deckType },
    ...rest,
  };
}

function apiDeck(cards: TcgArchitectApiCard[], overrides: Partial<TcgArchitectApiDeck> = {}): TcgArchitectApiDeck {
  return {
    id: "abc-123",
    user_id: 1,
    name: "Test Deck",
    created_at: "2026-01-01T00:00:00.000000Z",
    updated_at: "2026-01-01T00:00:00.000000Z",
    visibility: "public",
    format: "standard",
    like_count: 0,
    cards,
    user: { id: 1, username: "TestUser" },
    ...overrides,
  };
}

describe("transformTcgArchitectDeck", () => {
  it("picks the level 1+ Champion in material, excluding the level-0 Spirit", () => {
    const deck = transformTcgArchitectDeck(
      apiDeck([
        card({ id: "spirit", name: "Spirit of Fire", deckType: "material", types: ["CHAMPION"], level: 0 }),
        card({ id: "champ", name: "Dante, Prodigal Swain", deckType: "material", types: ["CHAMPION"], level: 1 }),
        card({ id: "blade", name: "Reliable Blade", deckType: "material", types: ["REGALIA", "ITEM"] }),
      ]),
      "2026-01-01T00:00:00Z",
    );
    assert.equal(deck.champion, "Dante, Prodigal Swain");
  });

  it("returns null champion when material has no level 1+ Champion", () => {
    const deck = transformTcgArchitectDeck(
      apiDeck([card({ id: "spirit", name: "Spirit of Fire", deckType: "material", types: ["CHAMPION"], level: 0 })]),
      "2026-01-01T00:00:00Z",
    );
    assert.equal(deck.champion, null);
  });

  it("buckets main/material/sideboard/boons by deck_type and drops maybeboard", () => {
    const deck = transformTcgArchitectDeck(
      apiDeck([
        card({ id: "a", name: "Reliable Blade", deckType: "material" }),
        card({ id: "b", name: "Fanned Synchron", deckType: "main", quantity: 4 }),
        card({ id: "c", name: "Fanned Synchron", deckType: "sideboard", quantity: 2 }),
        card({ id: "d", name: "Boon of Fire", deckType: "boons" }),
        card({ id: "e", name: "Someday Maybe", deckType: "maybeboard" }),
      ]),
      "2026-01-01T00:00:00Z",
    );
    assert.deepEqual(deck.materialDeck, [{ name: "Reliable Blade", quantity: 1 }]);
    assert.deepEqual(deck.mainDeck, [{ name: "Fanned Synchron", quantity: 4 }]);
    assert.deepEqual(deck.sideDeck, [{ name: "Fanned Synchron", quantity: 2 }]);
    assert.deepEqual(deck.pantheonDeck, [{ name: "Boon of Fire", quantity: 1 }]);
    assert.equal(deck.mainCount, 4);
    assert.equal(deck.sideCount, 2);
  });

  it("omits pantheonDeck entirely when the deck has no boons", () => {
    const deck = transformTcgArchitectDeck(apiDeck([card({ id: "a", name: "Reliable Blade", deckType: "main" })]), "2026-01-01T00:00:00Z");
    assert.equal(deck.pantheonDeck, undefined);
  });

  it("maps the site's format string and always sets priceLow null", () => {
    const standard = transformTcgArchitectDeck(apiDeck([], { format: "standard" }), "2026-01-01T00:00:00Z");
    assert.equal(standard.format, "STANDARD");
    assert.equal(standard.formatConfidence, "declared");
    assert.equal(standard.priceLow, null);

    const pantheon = transformTcgArchitectDeck(apiDeck([], { format: "pantheon" }), "2026-01-01T00:00:00Z");
    assert.equal(pantheon.format, "PANTHEON");

    const unknown = transformTcgArchitectDeck(apiDeck([], { format: "draft" }), "2026-01-01T00:00:00Z");
    assert.equal(unknown.format, "UNKNOWN");
    assert.equal(unknown.formatConfidence, "unknown");
  });

  it("carries id/url/author/likeCount/timestamps through from the API deck", () => {
    const deck = transformTcgArchitectDeck(
      apiDeck([], { id: "xyz-789", user_id: 42, name: "My Deck", like_count: 7, user: { id: 42, username: "Someone" } }),
      "2026-01-01T00:00:00Z",
    );
    assert.equal(deck.id, "xyz-789");
    assert.equal(deck.url, "https://tcgarchitect.com/grand-archive/decks/xyz-789");
    assert.equal(deck.title, "My Deck");
    assert.equal(deck.author, "Someone");
    assert.equal(deck.likeCount, 7);
    assert.equal(deck.fetchedAt, "2026-01-01T00:00:00Z");
  });
});
