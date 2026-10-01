import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture } from "./helpers/database";
import { createDeckFolder, updateDeckFolder, deleteDeckFolder, listDeckFolders, parseFolderInput } from "../src/deck-folders";
import type { AuthUser } from "../src/auth";
function fixture() {
  const { db, env, beforeBatch } = databaseFixture();
  db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now')");
  for (const [id, user] of [["one", "a"], ["two", "a"], ["private", "b"]]) db.prepare("INSERT INTO saved_decks(id,user_id,identity_hash,title,format,decklist_json,created_at,updated_at) VALUES(?,?,?,?,'STANDARD','{}','now','now')").run(id, user, id, id);
  return { db, env, a: { id: "a" } as AuthUser, b: { id: "b" } as AuthUser, beforeBatch };
}
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
test("folders normalize names, validate membership, and reject duplicate names", async () => {
  const f = fixture(); try {
    assert.deepEqual(parseFolderInput({ name: " Fire ", deckIds: ["two", "one", "one"] }), { name: "Fire", deckIds: ["one", "two"] });
    assert.throws(() => parseFolderInput({ name: " ", deckIds: [] }));
    assert.throws(() => parseFolderInput({ name: "x".repeat(61), deckIds: [] }));
    assert.throws(() => parseFolderInput({ name: "A\nB", deckIds: [] }));
    await assert.rejects(createDeckFolder(f.env, f.a, { id, name: "Fire", deckIds: ["private"] }), /unavailable/);
    await createDeckFolder(f.env, f.a, { id, name: "Fire", deckIds: ["one"] });
    await assert.rejects(createDeckFolder(f.env, f.a, { id: other, name: "fire", deckIds: [] }), /already exists/);
    assert.deepEqual(await listDeckFolders(f.env, f.b), []);
    await assert.rejects(updateDeckFolder(f.env, f.b, id, { name: "Mine", deckIds: [], revision: 0 }), /not found/);
    await deleteDeckFolder(f.env, f.b, id, 0);
    assert.equal((await listDeckFolders(f.env, f.a)).length, 1);
  } finally { f.db.close(); }
});
test("multiple folders preserve decks, deletion cascades only membership, retries are idempotent", async () => {
  const f = fixture(); try {
    const input = { id, name: "Fire", deckIds: ["one"] };
    const results = await Promise.all([createDeckFolder(f.env, f.a, input), createDeckFolder(f.env, f.a, input)]);
    assert.deepEqual(results[0], results[1]);
    await createDeckFolder(f.env, f.a, { id: other, name: "Lorraine", deckIds: ["one", "two"] });
    await assert.rejects(createDeckFolder(f.env, f.a, { ...input, name: "Different" }), /already created/);
    const updated = await updateDeckFolder(f.env, f.a, id, { name: "Fire testing", deckIds: ["one", "two"], revision: 0 });
    assert.equal(updated.revision, 1);
    assert.deepEqual(await updateDeckFolder(f.env, f.a, id, { name: "Fire testing", deckIds: ["one", "two"], revision: 0 }), updated);
    await deleteDeckFolder(f.env, f.a, id, 1);
    await deleteDeckFolder(f.env, f.a, id, 1);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM saved_decks").get()!.n, 3);
    assert.deepEqual((await listDeckFolders(f.env, f.a))[0].deckIds, ["one", "two"]);
    f.db.exec("DELETE FROM saved_decks WHERE id = 'one'");
    assert.deepEqual((await listDeckFolders(f.env, f.a))[0].deckIds, ["two"]);
    f.db.exec("DELETE FROM users WHERE id = 'a'");
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_folders").get()!.n, 0);
  } finally { f.db.close(); }
});
test("stale and racing writes cannot replace another edit's membership", async () => {
  const f = fixture(); try {
    await createDeckFolder(f.env, f.a, { id, name: "Fire", deckIds: ["one"] });
    f.beforeBatch(() => f.db.prepare("UPDATE deck_folders SET revision = 1, name = 'Changed elsewhere' WHERE id = ?").run(id));
    await assert.rejects(updateDeckFolder(f.env, f.a, id, { revision: 0, name: "Overwrite", deckIds: ["two"] }), /changed elsewhere/);
    assert.deepEqual((await listDeckFolders(f.env, f.a))[0].deckIds, ["one"]);
    await assert.rejects(deleteDeckFolder(f.env, f.a, id, 0), /changed elsewhere/);
    f.db.exec("CREATE TRIGGER fail_folder_member BEFORE INSERT ON deck_folder_members BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(updateDeckFolder(f.env, f.a, id, { revision: 1, name: "Failed write", deckIds: ["two"] }), /test failure/);
    const current = (await listDeckFolders(f.env, f.a))[0];
    assert.equal(current.name, "Changed elsewhere"); assert.equal(current.revision, 1); assert.deepEqual(current.deckIds, ["one"]);
  } finally { f.db.close(); }
});

test("folder appearance persists atomically, survives membership-only edits, and supports clearing", async () => {
  const f = fixture(); try {
    const input = { id, name: "Wind testing", deckIds: ["one"], coverCardName: "  Lorraine, Wandering Warrior  ", accent: "teal" };
    const created = await createDeckFolder(f.env, f.a, input);
    assert.equal(created.coverCardName, "Lorraine, Wandering Warrior");
    assert.equal(created.accent, "teal");
    assert.deepEqual(await createDeckFolder(f.env, f.a, input), created);
    await assert.rejects(createDeckFolder(f.env, f.a, { ...input, accent: "blue" }), /already created/);
    const membership = await updateDeckFolder(f.env, f.a, id, { name: created.name, deckIds: ["one", "two"], revision: 0 });
    assert.equal(membership.coverCardName, created.coverCardName);
    assert.equal(membership.accent, "teal");
    await assert.rejects(updateDeckFolder(f.env, f.a, id, { ...input, revision: 0, accent: "lavender" }), /changed elsewhere/);
    f.db.exec("CREATE TRIGGER fail_cover_member BEFORE INSERT ON deck_folder_members BEGIN SELECT RAISE(ABORT, 'cover rollback'); END");
    const change = { name: created.name, deckIds: ["two"], revision: 1, coverCardName: null, accent: "rosewater" };
    await assert.rejects(updateDeckFolder(f.env, f.a, id, change), /cover rollback/);
    assert.deepEqual((await listDeckFolders(f.env, f.a))[0], membership);
    f.db.exec("DROP TRIGGER fail_cover_member");
    const updated = await updateDeckFolder(f.env, f.a, id, change);
    assert.equal(updated.coverCardName, null);
    assert.equal(updated.accent, "rosewater");
    assert.deepEqual(await updateDeckFolder(f.env, f.a, id, change), updated);
  } finally { f.db.close(); }
});

test("appearance validation applies to creation and updates and duplicate names roll back preferences", async () => {
  const f = fixture(); try {
    await createDeckFolder(f.env, f.a, { id, name: "One", deckIds: [], coverCardName: "Dungeon Guide", accent: "lavender" });
    const before = (await listDeckFolders(f.env, f.a))[0];
    for (const invalid of [{ accent: "red" }, { accent: null }, { coverCardName: 12 }, { coverCardName: "" }, { coverCardName: "x".repeat(161) }, { coverCardName: "Bad\nName" }]) {
      await assert.rejects(createDeckFolder(f.env, f.a, { id: other, name: "Two", deckIds: [], ...invalid }));
      await assert.rejects(updateDeckFolder(f.env, f.a, id, { revision: 0, name: "One", deckIds: [], ...invalid }));
    }
    await createDeckFolder(f.env, f.a, { id: other, name: "Two", deckIds: [] });
    await assert.rejects(updateDeckFolder(f.env, f.a, id, { revision: 0, name: "Two", deckIds: [], accent: "teal", coverCardName: null }), /already exists/);
    assert.deepEqual((await listDeckFolders(f.env, f.a, id))[0], before);
  } finally { f.db.close(); }
});

test("a failed create leaves no appearance record, and racing creates never report a different preference as saved", async () => {
  const f = fixture(); try {
    const input = { id, name: "Personal", deckIds: ["one"], coverCardName: "Dungeon Guide", accent: "teal" };
    f.db.exec("CREATE TRIGGER fail_new_cover BEFORE INSERT ON deck_folder_members BEGIN SELECT RAISE(ABORT, 'create rollback'); END");
    await assert.rejects(createDeckFolder(f.env, f.a, input), /create rollback/);
    assert.deepEqual(await listDeckFolders(f.env, f.a), []);
    f.db.exec("DROP TRIGGER fail_new_cover");
    const results = await Promise.allSettled([createDeckFolder(f.env, f.a, input), createDeckFolder(f.env, f.a, { ...input, accent: "lavender" })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const folder = (await listDeckFolders(f.env, f.a))[0];
    assert.deepEqual(folder.deckIds, ["one"]);
    assert.deepEqual(await createDeckFolder(f.env, f.a, { ...input, accent: folder.accent }), folder);
  } finally { f.db.close(); }
});
