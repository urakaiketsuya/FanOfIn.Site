import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { listTagOverrides, listTagProposals, parseTagProposal, reviewTagProposal, submitTagProposal } from "../src/card-tags";
import type { AuthUser, Env } from "../src/auth";
function fixture() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter(file => file.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now'),('mod','mod','mod@example.test','Mod','now','now')");
  db.exec("UPDATE users SET community_role = 'moderator' WHERE id = 'mod'");
  let beforeBatch: (() => void) | undefined;
  const prepare = (sql: string) => { let args: unknown[] = []; return {
    bind(...values: unknown[]) { args = values; return this; },
    async first() { return db.prepare(sql).get(...args as never[]) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args as never[]).map(row => ({ ...row })) }; },
    async run() { return { meta: db.prepare(sql).run(...args as never[]) }; },
  }; };
  const env = { ASSET_BASE_URL: "https://assets.example.test", ACCOUNT_DB: { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    const hook = beforeBatch; beforeBatch = undefined; hook?.();
    db.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec("COMMIT"); return results; } catch (error) { db.exec("ROLLBACK"); throw error; }
  } } } as unknown as Env;
  return { db, env, a: { id: "a" } as AuthUser, b: { id: "b" } as AuthUser, mod: { id: "mod" } as AuthUser, beforeBatch(hook: () => void) { beforeBatch = hook; } };
}
const input = () => ({ id: crypto.randomUUID(), tag: "Lorraine", action: "add", targets: [{ cardUuid: "card-a", editionUuid: "print-a" }], reason: "Lorraine appears in this artwork." });
function assets(t: Parameters<Parameters<typeof test>[1]>[0]) {
  t.mock.method(globalThis, "fetch", async (url: URL) => Response.json(url.pathname.endsWith("card-tag-targets.json") ? { cards: [{ uuid: "card-a", editions: [{ uuid: "print-a" }, { uuid: "print-b" }] }] } : { tags: [{ name: "Lorraine Allard" }, { name: "Mill" }] }));
}
test("validate shape, scope and batch limits", () => {
  assert.throws(() => parseTagProposal(null));
  assert.throws(() => parseTagProposal({ ...input(), targets: [] }));
  assert.throws(() => parseTagProposal({ ...input(), targets: Array(51).fill(input().targets[0]) }));
  assert.throws(() => parseTagProposal({ ...input(), targets: [input().targets[0], input().targets[0]] }));
  assert.throws(() => parseTagProposal({ ...input(), tag: "Mill" }));
  assert.throws(() => parseTagProposal({ ...input(), targets: [{ cardUuid: "card-a", editionUuid: null }] }));
  assert.equal(parseTagProposal(input()).tag, "Lorraine Allard");
});
test("pending suggestions are private and do not publish; retries and conflicts are safe", async t => {
  assets(t); const f = fixture(); try {
    const value = input();
    const saved = await submitTagProposal(f.env, f.a, value);
    assert.equal(saved.status, "pending");
    assert.deepEqual(await submitTagProposal(f.env, f.a, value), saved);
    assert.deepEqual(await listTagOverrides(f.env), []);
    assert.equal((await listTagProposals(f.env, f.b, false, 0)).proposals.length, 0);
    await assert.rejects(listTagProposals(f.env, f.a, true, 0), /Moderator/);
    await assert.rejects(reviewTagProposal(f.env, f.a, value.id, { decision: "approved" }), /Moderator/);
    await assert.rejects(submitTagProposal(f.env, f.b, value), /already in use/);
    await assert.rejects(submitTagProposal(f.env, f.a, { ...value, reason: "Different" }), /already in use/);
    await assert.rejects(submitTagProposal(f.env, f.a, { ...input(), tag: "Invented" }), /published tag/);
    await assert.rejects(submitTagProposal(f.env, f.a, { ...input(), targets: [{ cardUuid: "card-a", editionUuid: "wrong-print" }] }), /no longer available/);
  } finally { f.db.close(); }
});
test("approval and corrections publish atomically, preserve history and survive account deletion", async t => {
  assets(t); const f = fixture(); try {
    const value = input();
    await submitTagProposal(f.env, f.a, value);
    await reviewTagProposal(f.env, f.mod, value.id, { decision: "approved" });
    assert.deepEqual(await listTagOverrides(f.env), [{ cardUuid: "card-a", editionUuid: "print-a", tag: "Lorraine Allard", action: "add" }]);
    await assert.rejects(reviewTagProposal(f.env, f.mod, value.id, { decision: "rejected" }), /already been reviewed/);
    const correction = { ...input(), action: "remove" };
    await submitTagProposal(f.env, f.b, correction);
    await reviewTagProposal(f.env, f.mod, correction.id, { decision: "approved" });
    assert.equal((await listTagOverrides(f.env))[0].action, "remove");
    assert.equal((await listTagProposals(f.env, f.a, false, 0)).proposals[0].status, "approved");
    f.db.exec("DELETE FROM users WHERE id IN ('a', 'b', 'mod')");
    assert.equal((await listTagOverrides(f.env))[0].action, "remove");
  } finally { f.db.close(); }
});
test("a racing reviewer cannot publish after another decision; failed batches roll back", async t => {
  assets(t); const f = fixture(); try {
    const value = input(); await submitTagProposal(f.env, f.a, value);
    f.beforeBatch(() => f.db.prepare("UPDATE card_tag_proposals SET status = 'rejected' WHERE id = ?").run(value.id));
    await assert.rejects(reviewTagProposal(f.env, f.mod, value.id, { decision: "approved" }), /already been reviewed/);
    assert.deepEqual(await listTagOverrides(f.env), []);
    const next = input(); await submitTagProposal(f.env, f.a, next);
    f.db.exec("CREATE TRIGGER fail_override BEFORE INSERT ON card_tag_overrides BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(reviewTagProposal(f.env, f.mod, next.id, { decision: "approved" }), /test failure/);
    assert.equal((await listTagProposals(f.env, f.mod, true, 0)).proposals[0].status, "pending");
  } finally { f.db.close(); }
});

test("published validation rejects redirects without following them", async t => {
  t.mock.method(globalThis, "fetch", async (_url: URL, init: RequestInit) => {
    assert.equal(init.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "https://unrelated.example.test" } });
  });
  const f = fixture(); try {
    await assert.rejects(submitTagProposal(f.env, f.a, input()), /temporarily unavailable/);
    assert.equal((await listTagProposals(f.env, f.a, false, 0)).proposals.length, 0);
  } finally { f.db.close(); }
});
