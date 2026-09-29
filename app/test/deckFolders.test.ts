import assert from "node:assert/strict";
import { test } from "node:test";
import type { DeckFolder, SavedDeck } from "@gatcg/shared";
import { decksInFolder } from "../src/features/account/deckFolders.ts";
const decks = [{ id: "a" }, { id: "b" }, { id: "c" }] as SavedDeck[];
const folders = [{ id: "fire", deckIds: ["a", "b", "removed"] }, { id: "lorraine", deckIds: ["a"] }] as DeckFolder[];
test("folder filtering supports overlaps, empty folders and unfiled without duplicating builds", () => {
  assert.deepEqual(decksInFolder(decks, folders, "fire").map(deck => deck.id), ["a", "b"]);
  assert.deepEqual(decksInFolder(decks, folders, "lorraine").map(deck => deck.id), ["a"]);
  assert.deepEqual(decksInFolder(decks, folders, "unfiled").map(deck => deck.id), ["c"]);
  assert.deepEqual(decksInFolder(decks, folders, "unknown"), []);
  assert.equal(decksInFolder(decks, folders, ""), decks);
});
