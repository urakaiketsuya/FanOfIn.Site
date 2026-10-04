import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture } from "./helpers/database";
import { parseSaveInput, validDecklist } from "../src/deck-input";
import { saveDeck, getDeck, getPublicDeck, listDecks, createDeckVersion, updateDeckDecklist, restoreDeckVersion } from "../src/decks";
import { updateCollection, listCollection } from "../src/collection";
import type { AuthUser } from "../src/auth";

function fixture(t: import("node:test").TestContext) {
  const f = databaseFixture();
  f.env.ASSET_BASE_URL = "https://assets.example.test";
  t.mock.method(globalThis, "fetch", async () => Response.json({ e1: ["c", "Card", "ONE", "001"], e2: ["c", "Card", "TWO", "002"], wrong: ["other", "Other", "ONE", "003"] }));
  f.db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@test','A','now','now'),('b','b','b@test','B','now','now')");
  const user = { id: "a" } as AuthUser;
  const decklist = { main: [{ card: "Card", quantity: 3, printings: [{ editionUuid: "e1", quantity: 2 }] }], material: [], sideboard: [] };
  const input = parseSaveInput({ title: "Printed deck", format: "STANDARD", decklist, source: { provider: "manual", externalDeckId: "one", label: "Manual" } });
  t.after(() => f.db.close());
  return { ...f, user, decklist, input };
}
test("printing versions preserve identity, isolate owners, publish and restore their own choices", async t => {
  const f = fixture(t);
  const { id } = await saveDeck(f.env, f.user, f.input);
  const before = (await getDeck(f.env, f.user, id))!;
  const b = await saveDeck(f.env, { id: "b" } as AuthUser, { ...f.input, decklist: { ...f.decklist, main: [{ card: "Card", quantity: 3 }] } });
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n, 1);
  assert.equal((await getDeck(f.env, { id: "b" } as AuthUser, b.id))!.decklist.main[0].printings, undefined);
  const changed = { ...f.decklist, main: [{ card: "Card", quantity: 3, printings: [{ editionUuid: "e2", quantity: 3 }] }] };
  const command = { decklist: changed, format: "STANDARD", expectedRevision: before.revision, requestId: crypto.randomUUID() };
  const results = await Promise.all([createDeckVersion(f.env, f.user, id, command), createDeckVersion(f.env, f.user, id, command)]);
  assert.deepEqual(results[0], results[1]);
  const after = (await getDeck(f.env, f.user, id))!;
  assert.equal(after.identityHash, before.identityHash);
  assert.equal(after.versionCount, 2);
  assert.deepEqual(after.decklist, changed);
  assert.deepEqual((await listDecks(f.env, f.user))[0].decklist, changed);
  assert.deepEqual((await getPublicDeck(f.env, after.publicSlug!))!.decklist, changed);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n, 1);
  await assert.rejects(updateDeckDecklist(f.env, f.user, id, { ...command, decklist: f.decklist }), /different save/);
  await assert.rejects(createDeckVersion(f.env, f.user, id, { ...command, requestId: crypto.randomUUID() }), /changed elsewhere/);
  await restoreDeckVersion(f.env, f.user, id, before.currentVersionId, { expectedRevision: after.revision, requestId: crypto.randomUUID() });
  assert.deepEqual((await getDeck(f.env, f.user, id))!.decklist, f.decklist);
});
test("printing updates roll back with version and receipt; rejected card/edition pairs write nothing", async t => {
  const f = fixture(t);
  const { id } = await saveDeck(f.env, f.user, f.input);
  const before = (await getDeck(f.env, f.user, id))!;
  const command = { decklist: { ...f.decklist, main: [{ card: "Card", quantity: 3, printings: [{ editionUuid: "e2", quantity: 1 }] }] }, format: "STANDARD", expectedRevision: before.revision, requestId: crypto.randomUUID() };
  f.db.exec("CREATE TRIGGER fail_printing BEFORE UPDATE ON saved_decks BEGIN SELECT RAISE(ABORT,'printing failure'); END");
  await assert.rejects(updateDeckDecklist(f.env, f.user, id, command), /printing failure/);
  assert.deepEqual(await getDeck(f.env, f.user, id), before);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_save_receipts").get()!.n, 0);
  f.db.exec("DROP TRIGGER fail_printing");
  await updateDeckDecklist(f.env, f.user, id, command);
  await assert.rejects(saveDeck(f.env, f.user, { ...f.input, decklist: { ...f.decklist, main: [{ card: "Card", quantity: 3, printings: [{ editionUuid: "wrong", quantity: 1 }] }] } }), /does not belong/);
  assert.equal(validDecklist({ ...f.decklist, main: [{ card: "Card", quantity: 1, printings: [{ editionUuid: "e1", quantity: 2 }] }] }), false);
});
test("identify copies is atomic, conserves totals and proxies, retries once, and rejects stale drafts", async t => {
  const f = fixture(t);
  await updateCollection(f.env, f.user, { mode: "set", source: "Setup", lines: [{ cardUuid: "c", cardName: "Card", quantity: 4, proxyQuantity: 1 }] });
  const command = { mode: "set", source: "Identify", requestId: crypto.randomUUID(), lines: [
    { cardUuid: "c", cardName: "Card", quantity: 1, proxyQuantity: 1, expectedOwnedQuantity: 4, expectedProxyQuantity: 1 },
    { cardUuid: "c", cardName: "Card", editionUuid: "e1", quantity: 3, expectedOwnedQuantity: 0, expectedProxyQuantity: 0 },
  ] };
  f.db.exec("CREATE TRIGGER fail_printing BEFORE INSERT ON collection_printing_entries BEGIN SELECT RAISE(ABORT,'printing failure'); END");
  await assert.rejects(updateCollection(f.env, f.user, command), /printing failure/);
  assert.equal((await listCollection(f.env, f.user)).entries[0].ownedQuantity, 4);
  f.db.exec("DROP TRIGGER fail_printing");
  const results = await Promise.all([updateCollection(f.env, f.user, command), updateCollection(f.env, f.user, command)]);
  assert.deepEqual(results[0], results[1]);
  const entries = (await listCollection(f.env, f.user)).entries;
  assert.equal(entries.reduce((sum, e) => sum + e.ownedQuantity, 0), 4);
  assert.equal(entries.reduce((sum, e) => sum + e.proxyQuantity, 0), 1);
  await assert.rejects(updateCollection(f.env, f.user, { ...command, requestId: crypto.randomUUID() }), /changed since your draft/);
  assert.equal((await listCollection(f.env, f.user)).transactions.length, 2);
});
test("copy and bookmark retain the published version's printings", async t => {
  const f = fixture(t);
  const { copyPublishedDeck, setDeckBookmark, listBookmarks } = await import("../src/deck-social");
  const { id } = await saveDeck(f.env, f.user, f.input);
  const published = (await getDeck(f.env, f.user, id))!;
  const other = { id: "b" } as AuthUser;
  await setDeckBookmark(f.env, other, published.publicSlug!, true);
  assert.deepEqual((await listBookmarks(f.env, other))[0].decklist, f.decklist);
  const copied = await copyPublishedDeck(f.env, other, published.publicSlug!);
  assert.deepEqual((await getDeck(f.env, other, copied.id))!.decklist, f.decklist);
});
test("acknowledged printing saves replay even when the catalog is temporarily unavailable", async t => {
  const f = fixture(t);
  const { id } = await saveDeck(f.env, f.user, f.input);
  const before = (await getDeck(f.env, f.user, id))!;
  const command = { decklist: f.decklist, format: "STANDARD", expectedRevision: before.revision, requestId: crypto.randomUUID() };
  const result = await updateDeckDecklist(f.env, f.user, id, command);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Catalog offline"); });
  assert.deepEqual(await updateDeckDecklist(f.env, f.user, id, command), result);
});
