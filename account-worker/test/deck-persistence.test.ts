import { parseSaveInput } from "../src/deck-input";
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { saveDeck } from "../src/decks";
import type { AuthUser, Env } from "../src/auth";

function fixture() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now')");
  const prepare = (sql: string) => {
    let args: unknown[] = [];
    return {
      bind(...values: unknown[]) { args = values; return this; },
      async first() { return db.prepare(sql).get(...args as never[]) ?? null; },
      run() { return { meta: db.prepare(sql).run(...args as never[]) }; },
    };
  };
  const env = { ACCOUNT_DB: { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    db.exec("BEGIN");
    try { const results = statements.map(s => s.run()); db.exec("COMMIT"); return results; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } } } as unknown as Env;
  const input = parseSaveInput({ title: "Test deck", format: "STANDARD", decklist: { main: [{ card: "Test card", quantity: 4 }], material: [], sideboard: [{ card: "Side card", quantity: 1 }] }, maybeboard: [{ card: "Maybe card", quantity: 2 }], source: { provider: "manual", externalDeckId: "test", label: "Manual" } });
  return { db, save: () => saveDeck(env, { id: "a" } as AuthUser, input) };
}

for (const table of ["saved_deck_sources", "canonical_builds", "user_decks", "deck_versions"]) {
  test(`failure inserting ${table} rolls back the entire deck and permits retry`, async () => {
    const f = fixture();
    try {
      f.db.exec(`CREATE TRIGGER fail_write BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'injected failure'); END`);
      await assert.rejects(f.save(), /injected failure/);
      for (const name of ["saved_decks", "saved_deck_sources", "canonical_builds", "user_decks", "deck_versions"]) assert.equal(f.db.prepare(`SELECT count(*) n FROM ${name}`).get()!.n, 0);
      f.db.exec("DROP TRIGGER fail_write");
      const saved = await f.save();
      assert.equal(saved.created, true);
      const row = f.db.prepare("SELECT * FROM user_decks").get()!;
      assert.equal(row.id, saved.id);
      assert.equal(row.current_version_id, row.published_version_id);
      assert.ok(row.current_version_id);
      assert.equal(row.visibility, "public");
      assert.deepEqual(JSON.parse(String(row.maybeboard_json)), [{ card: "Maybe card", quantity: 2 }]);
      assert.deepEqual(await f.save(), { id: saved.id, created: false });
      assert.equal(f.db.prepare("SELECT count(*) n FROM deck_versions").get()!.n, 1);
    } finally { f.db.close(); }
  });
}

test("simultaneous saves of the same identity converge on one complete deck", async () => {
  const f = fixture();
  try {
    const results = await Promise.all([f.save(), f.save()]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(results.filter(r => r.created).length, 1);
    for (const table of ["saved_decks", "saved_deck_sources", "user_decks", "deck_versions"]) assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 1);
  } finally { f.db.close(); }
});

test("a final pointer write failure rolls back earlier inserts", async () => {
  const f = fixture();
  try {
    f.db.exec("CREATE TRIGGER fail_write BEFORE UPDATE ON user_decks BEGIN SELECT RAISE(ABORT, 'pointer failure'); END");
    await assert.rejects(f.save(), /pointer failure/);
    assert.equal(f.db.prepare("SELECT count(*) n FROM saved_decks").get()!.n, 0);
    assert.equal(f.db.prepare("SELECT count(*) n FROM deck_versions").get()!.n, 0);
  } finally { f.db.close(); }
});
