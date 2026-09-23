import assert from "node:assert/strict";
import test from "node:test";
import type { SavedDeck } from "@gatcg/shared";
import { loadDeckLibrary } from "../src/features/account/loadDeckLibrary";

const deck = { id: "deck-1", title: "Loaded deck" } as SavedDeck;

test("loads editable decks when optional favorite requests fail", async () => {
  const result = await loadDeckLibrary({
    decks: async () => ({ decks: [deck] }),
    bookmarks: async () => { throw new Error("bookmarks unavailable"); },
    tournamentFavorites: async () => { throw new Error("favorites unavailable"); },
  });

  assert.deepEqual(result.decks, [deck]);
  assert.deepEqual(result.bookmarks, []);
  assert.deepEqual(result.tournamentFavorites, []);
  assert.equal(result.optionalLoadFailed, true);
});

test("still rejects when the editable deck request fails", async () => {
  await assert.rejects(() => loadDeckLibrary({
    decks: async () => { throw new Error("decks unavailable"); },
    bookmarks: async () => ({ decks: [] }),
    tournamentFavorites: async () => ({ decks: [] }),
  }), /decks unavailable/);
});
