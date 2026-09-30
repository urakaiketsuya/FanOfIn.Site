import assert from "node:assert/strict";
import test from "node:test";
import { deckEditReducer as reduce, emptyDeckEditSession as empty } from "../src/features/account/deckEditSession";

test("deck and maybeboard edits undo and redo together, branching clears redo", () => {
  const first = reduce(empty, { type: "commit", deckText: "4x A", maybeboardText: "2x B" });
  const second = reduce(first, { type: "commit", deckText: "3x A", maybeboardText: "1x A\n2x B" });
  const undone = reduce(second, { type: "undo" });
  assert.equal(undone.deckText, first.deckText);
  assert.equal(undone.maybeboardText, first.maybeboardText);
  assert.deepEqual(reduce(undone, { type: "redo" }), second);
  const branch = reduce(undone, { type: "commit", deckText: "2x A" });
  assert.equal(branch.maybeboardText, first.maybeboardText);
  assert.equal(branch.history.future.length, 0);
});

test("no-op edits preserve history and history stays bounded", () => {
  assert.equal(reduce(empty, { type: "undo" }), empty);
  assert.equal(reduce(empty, { type: "redo" }), empty);
  assert.equal(reduce(empty, { type: "commit", deckText: "" }), empty);
  let state = empty;
  for (let index = 0; index < 80; index++) state = reduce(state, { type: "commit", deckText: String(index) });
  assert.equal(state.history.past.length, 50);
  for (let index = 0; index < 50; index++) state = reduce(state, { type: "undo" });
  assert.equal(state.deckText, "29");
  assert.equal(state.history.future.length, 50);
});

import { readDeckDraft, deckDraftKey } from "../src/features/account/deckDraft";

test("draft restoration rejects stale or malformed storage and tolerates unavailable storage", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key); } };
  values.set(deckDraftKey("a"), JSON.stringify({ deckText: "draft", maybeboardText: "maybe", baseUpdatedAt: "v1" }));
  assert.deepEqual(readDeckDraft(storage, "a", "v1"), { deckText: "draft", maybeboardText: "maybe" });
  assert.equal(readDeckDraft(storage, "a", "v2"), null);
  assert.equal(values.size, 0);
  values.set(deckDraftKey("a"), "{broken");
  assert.equal(readDeckDraft(storage, "a", "v1"), null);
  assert.equal(readDeckDraft({ ...storage, getItem: () => { throw new Error("Storage unavailable"); } }, "a", "v1"), null);
});
