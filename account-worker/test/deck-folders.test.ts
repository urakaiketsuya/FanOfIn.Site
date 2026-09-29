import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createDeckFolder, updateDeckFolder, deleteDeckFolder, listDeckFolders, parseFolderInput } from "../src/deck-folders";
import type { AuthUser, Env } from "../src/auth";
function fixture() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter(file => file.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now')");
  for (const [id, user] of [["one", "a"], ["two", "a"], ["private", "b"]]) db.prepare("INSERT INTO saved_decks(id,user_id,identity_hash,title,format,decklist_json,created_at,updated_at) VALUES(?,?,?,?,'STANDARD','{}','now','now')").run(id, user, id, id);
  let beforeBatch: (() => void) | undefined;
  const prepare = (sql: string) => { let args: unknown[] = []; return {
    bind(...values: unknown[]) { args = values; return this; },
    async first() { return db.prepare(sql).get(...args as never[]) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args as never[]) }; },
    run() { return { meta: db.prepare(sql).run(...args as never[]) }; },
  }; };
  const env = { ACCOUNT_DB: { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    const hook = beforeBatch; beforeBatch = undefined; hook?.();
    db.exec("BEGIN"); try { const results = statements.map(statement => statement.run()); db.exec("COMMIT"); return results; } catch (error) { db.exec("ROLLBACK"); throw error; }
  } } } as unknown as Env;
  return { db, env, a: { id: "a" } as AuthUser, b: { id: "b" } as AuthUser, beforeBatch(hook: () => void) { beforeBatch = hook; } };
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
