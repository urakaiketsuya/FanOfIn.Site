import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBrowseHandoff, readBrowseHandoff, saveBrowseHandoff, type BrowseHandoff } from "../src/features/compare/browseHandoff";

test("static-host canonical browse URLs retain their trailing slash and filters", () => {
  for (const browseReturnTo of ["/decks", "/decks/", "/decks?source=tournament", "/decks/?source=tournament"]) {
    assert.deepEqual(readBrowseHandoff({ browseReturnTo, browseDecks: [] }), { browseReturnTo, browseDecks: [] });
  }
  assert.equal(readBrowseHandoff({ browseReturnTo: "/decks/other", browseDecks: [] }), null);
});

test("comparison survives loss of navigation state and keeps separate comparison snapshots", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const handoff: BrowseHandoff = { browseReturnTo: "/decks?source=tournament", browseDecks: [{ key: "1:2", label: "Player @ Event", source: { kind: "sighting", eventId: 1, player: 2, decklist: { main: [{ card: "A", quantity: 4 }], material: [], sideboard: [{ card: "B", quantity: 2 }] } } }] };
  assert.equal(saveBrowseHandoff("first", handoff, storage), true);
  assert.equal(saveBrowseHandoff("second", { ...handoff, browseDecks: [] }, storage), true);
  assert.deepEqual(loadBrowseHandoff("first", storage), handoff);
  assert.deepEqual(loadBrowseHandoff("second", storage)?.browseDecks, []);
  assert.equal(saveBrowseHandoff("first", { ...handoff, browseDecks: [] }, storage), true);
  assert.deepEqual(loadBrowseHandoff("first", storage)?.browseDecks, []);
});

test("missing, corrupt and blocked storage are recoverable", () => {
  assert.equal(loadBrowseHandoff("missing", { getItem: () => null }), null);
  assert.equal(loadBrowseHandoff("corrupt", { getItem: () => "{" }), null);
  assert.equal(loadBrowseHandoff("blocked", { getItem: () => { throw new Error(); } }), null);
  assert.equal(saveBrowseHandoff("blocked", { browseDecks: [], browseReturnTo: "/decks" }, { setItem: () => { throw new Error(); } }), false);
  assert.equal(loadBrowseHandoff("invalid", { getItem: () => JSON.stringify({ browseDecks: [], browseReturnTo: "https://example.com" }) }), null);
});
