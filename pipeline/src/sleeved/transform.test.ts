import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CardSignature } from "../cards/catalog.js";
import type { SleevedApiDeck } from "./client.js";
import { transformSleevedDeck } from "./transform.js";

function card(overrides: Partial<CardSignature> & { name: string; slug: string }): CardSignature {
  return { classes: [], types: ["ACTION"], subtypes: [], elements: [], level: null, effect: null, editions: [], ...overrides };
}

const CATALOG: CardSignature[] = [
  card({ name: "Lorraine, Wandering Warrior", slug: "lorraine-wandering-warrior", types: ["CHAMPION"], level: 1 }),
  card({ name: "Lorraine, Honed Operative", slug: "lorraine-honed-operative", types: ["CHAMPION"], level: 2 }),
  card({ name: "Spirit of Fire", slug: "spirit-of-fire", types: ["CHAMPION"], subtypes: ["SPIRIT"], level: 0 }),
  card({ name: "Nameless Champion", slug: "nameless-champion", types: ["CHAMPION"], level: 1 }),
  card({ name: "Reliable Blade", slug: "reliable-blade" }),
  card({ name: "Fanned Synchron", slug: "fanned-synchron" }),
];
const SLUG_INDEX = new Map(CATALOG.map((c) => [c.slug, c]));

function apiDeck(cards: SleevedApiDeck["cards"]): SleevedApiDeck {
  return { id: "abc-123", gameId: "grand-archive", name: "Test Deck", cards };
}

describe("transformSleevedDeck", () => {
  it("picks the champion by highest-level printing, excluding Spirits", () => {
    const { deck } = transformSleevedDeck(
      apiDeck([
        { cardId: "spirit-of-fire", quantity: 1, zoneId: "material" },
        { cardId: "lorraine-wandering-warrior", quantity: 1, zoneId: "material" },
        { cardId: "lorraine-honed-operative", quantity: 1, zoneId: "material" },
        { cardId: "reliable-blade", quantity: 1, zoneId: "material" },
        { cardId: "fanned-synchron", quantity: 4, zoneId: "main" },
      ]),
      SLUG_INDEX,
      "2026-01-01T00:00:00Z",
    );
    assert.equal(deck.champion, "Lorraine");
    assert.equal(deck.materialCount, 4);
    assert.equal(deck.mainCount, 4);
  });

  it("keeps a comma-less Champion's full name as its identity", () => {
    const { deck } = transformSleevedDeck(apiDeck([{ cardId: "nameless-champion", quantity: 1, zoneId: "material" }]), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.equal(deck.champion, "Nameless Champion");
  });

  it("never picks a Spirit as champion, even alone in the material zone", () => {
    // Verified against pipeline/src/analysis/decklists.ts's findChampionName, which this mirrors:
    // Spirits are unconditionally excluded, not a last-resort fallback (matches its actual filter,
    // not its own doc comment's looser "only win if nothing else qualifies" phrasing).
    const { deck } = transformSleevedDeck(apiDeck([{ cardId: "spirit-of-fire", quantity: 1, zoneId: "material" }]), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.equal(deck.champion, null);
  });

  it("returns null champion when the material zone has no Champion card at all", () => {
    const { deck } = transformSleevedDeck(apiDeck([{ cardId: "reliable-blade", quantity: 1, zoneId: "material" }]), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.equal(deck.champion, null);
  });

  it("buckets main/material/sideboard by zoneId and unrecognized zones into extraDeck", () => {
    const { deck } = transformSleevedDeck(
      apiDeck([
        { cardId: "reliable-blade", quantity: 1, zoneId: "material" },
        { cardId: "fanned-synchron", quantity: 4, zoneId: "main" },
        { cardId: "fanned-synchron", quantity: 2, zoneId: "sideboard" },
        { cardId: "reliable-blade", quantity: 1, zoneId: "extra" },
      ]),
      SLUG_INDEX,
      "2026-01-01T00:00:00Z",
    );
    assert.deepEqual(deck.materialDeck, [{ name: "Reliable Blade", quantity: 1 }]);
    assert.deepEqual(deck.mainDeck, [{ name: "Fanned Synchron", quantity: 4 }]);
    assert.deepEqual(deck.sideDeck, [{ name: "Fanned Synchron", quantity: 2 }]);
    assert.deepEqual(deck.extraDeck, [{ name: "Reliable Blade", quantity: 1 }]);
    assert.equal(deck.sideCount, 2);
  });

  it("tracks unresolved card slugs instead of dropping them", () => {
    const { deck, unresolvedCardIds } = transformSleevedDeck(apiDeck([{ cardId: "not-a-real-card", quantity: 2, zoneId: "main" }]), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.deepEqual(unresolvedCardIds, ["not-a-real-card"]);
    assert.deepEqual(deck.mainDeck, [{ name: "not-a-real-card", quantity: 2 }]);
  });

  it("infers Pantheon only for a complete singleton main+material identity of 60+", () => {
    const singletons = Array.from({ length: 60 }, (_, i) => ({ cardId: `card-${i}`, quantity: 1, zoneId: "main" as const }));
    const { deck } = transformSleevedDeck(apiDeck(singletons), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.equal(deck.format, "PANTHEON");
  });

  it("infers Standard when any card has more than one copy", () => {
    const { deck } = transformSleevedDeck(apiDeck([{ cardId: "fanned-synchron", quantity: 4, zoneId: "main" }]), SLUG_INDEX, "2026-01-01T00:00:00Z");
    assert.equal(deck.format, "STANDARD");
  });
});
