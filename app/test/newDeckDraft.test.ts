import assert from "node:assert/strict";
import test from "node:test";
import { readNewDeckDraft, newDeckTitleError, type NewDeckDraft } from "../src/features/account/newDeckDraft";
import { saveNewDeck, ExistingDeckError } from "../src/features/account/saveNewDeck";
import type { SavedDeckDetail } from "@gatcg/shared";

const draft: NewDeckDraft = { sourceId: "stable-source", title: "My draft", format: "STANDARD", deckText: "Main\n2 Dungeon Guide\n\nSideboard\n1 Backup Plan", maybeboardText: "1 Test card" };

test("new deck drafts restore identity, title, format and all card text", () => {
  assert.deepEqual(readNewDeckDraft({ getItem: () => JSON.stringify(draft) }), draft);
  for (const raw of ["{", "null", "{}", JSON.stringify({ ...draft, format: "invalid" })]) assert.equal(readNewDeckDraft({ getItem: () => raw }), null);
  assert.equal(readNewDeckDraft({ getItem: () => { throw new Error("blocked"); } }), null);
  assert.equal(newDeckTitleError("  ") !== null, true);
  assert.equal(newDeckTitleError("a".repeat(161)) !== null, true);
  assert.equal(newDeckTitleError("fuck") !== null, true);
  assert.equal(newDeckTitleError("My deck"), null);
});

test("failed creation can retry with the same source and recover a committed response", async () => {
  let calls = 0;
  let saved: SavedDeckDetail;
  const api = {
    saveDeck: async (input: Parameters<Parameters<typeof saveNewDeck>[0]["saveDeck"]>[0]) => {
      assert.equal(input.source.externalDeckId, draft.sourceId);
      saved = { ...input, id: "saved" } as SavedDeckDetail;
      if (++calls === 1) throw new Error("response lost");
      return { id: "saved", created: false };
    },
    deck: async () => ({ deck: saved }),
  };
  await assert.rejects(saveNewDeck(api, draft, null), /response lost/);
  assert.equal(await saveNewDeck(api, draft, null), "saved");
});

test("an existing build with different sideboard or title keeps the draft", async () => {
  const api = {
    saveDeck: async () => ({ id: "existing", created: false }),
    deck: async () => ({ deck: { title: "Older deck", format: "STANDARD", decklist: { main: [{ card: "Dungeon Guide", quantity: 2 }], material: [], sideboard: [] }, maybeboard: [] } as unknown as SavedDeckDetail }),
  };
  await assert.rejects(saveNewDeck(api, draft, null), (error: unknown) => error instanceof ExistingDeckError && error.deckId === "existing");
  assert.equal(draft.title, "My draft");
});

test("empty and maybeboard-only drafts never reach account persistence", async () => {
  const api = { saveDeck: async () => { throw new Error("unexpected API call"); }, deck: async () => { throw new Error("unexpected API call"); } };
  await assert.rejects(saveNewDeck(api, { ...draft, deckText: "" }, null), /Add a Main or Material card/);
});
