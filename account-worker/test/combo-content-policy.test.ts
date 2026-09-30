import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createCombo, updateCombo } from "../src/combos";
import type { AuthUser, Env } from "../src/auth";

const user = { id: "a" } as AuthUser;
const input = { name: "Classic Assassin", description: "A damn good plan", tags: ["Control"], definition: { schemaVersion: 1, requirements: [{ kind: "cards", cards: ["Catalog Card"], value: "", required: 1 }], damage: 0, goal: "cards", targetTurn: null } };
function fixture() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now')");
  const env = { ACCOUNT_DB: { prepare(sql: string) {
    let args: unknown[] = [];
    return { bind(...values: unknown[]) { args = values; return this; }, async first() { return db.prepare(sql).get(...args as never[]) ?? null; }, async all() { return { results: db.prepare(sql).all(...args as never[]) }; }, async run() { return { meta: db.prepare(sql).run(...args as never[]) }; } };
  } } } as unknown as Env;
  return { db, env };
}

test("combo display fields reject blocked language on create and update", async () => {
  const f = fixture();
  try {
    const { combo } = await createCombo(f.env, user, input);
    for (const patch of [{ name: "f.u.c.k" }, { description: "sh1t plan" }, { tags: ["bitch"] }]) {
      await assert.rejects(createCombo(f.env, user, { ...input, ...patch }), /blocked language/);
      await assert.rejects(updateCombo(f.env, user, combo.id, patch), /blocked language/);
    }
    const row = f.db.prepare("SELECT name, description, tags_json FROM user_combos").get()!;
    assert.equal(row.name, input.name);
    assert.equal(row.description, input.description);
    assert.deepEqual(JSON.parse(String(row.tags_json)), input.tags);
    assert.equal(f.db.prepare("SELECT count(*) n FROM user_combos").get()!.n, 1);
  } finally { f.db.close(); }
});

test("legacy combo publication checks unchanged text while privatization stays available", async () => {
  const f = fixture();
  try {
    const { combo } = await createCombo(f.env, user, input);
    for (const [column, value] of [["name", "fuck"], ["description", "shit"], ["tags_json", '["bitch"]']]) {
      f.db.prepare(`UPDATE user_combos SET ${column} = ? WHERE id = ?`).run(value, combo.id);
      for (const visibility of ["public", "unlisted"]) await assert.rejects(updateCombo(f.env, user, combo.id, { visibility }), /blocked language/);
      assert.equal((await updateCombo(f.env, user, combo.id, { visibility: "private" }))!.visibility, "private");
      await updateCombo(f.env, user, combo.id, { name: input.name, description: input.description, tags: input.tags });
    }
    assert.equal((await updateCombo(f.env, user, combo.id, { visibility: "public" }))!.visibility, "public");
  } finally { f.db.close(); }
});
