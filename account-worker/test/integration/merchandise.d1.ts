import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { listMerchandise, saveMerchandise } from "../../src/merchandise";
import { merchandiseItems } from "@gatcg/shared";
import type { AuthUser, Env } from "../../src/auth";

const directory = mkdtempSync(join(tmpdir(), "fanofin-d1-test-"));
let runtime: Miniflare | undefined;
try {
  execFileSync(process.execPath, ["../node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "fanofin-accounts-dev", "--local", "--persist-to", directory],
    { cwd: new URL("../../", import.meta.url), env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: join(directory, "wrangler.log") }, stdio: "pipe" });
  runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: "export default { fetch() { return new Response('test'); } }", compatibilityDate: "2026-08-24",
    d1Databases: { ACCOUNT_DB: "replace-with-development-d1-id" }, resourcePersistencePath: join(directory, "v3") }));
  const db = await runtime.getD1Database("ACCOUNT_DB");
  const env = { ACCOUNT_DB: db } as unknown as Env;
  await db.prepare("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@test','A','now','now')").run();
  const user = { id: "a" } as AuthUser;
  const command = { expectedUserId: "a", expectedRevision: 0, requestId: crypto.randomUUID(), quantities: { [merchandiseItems[0].id]: 2 } };
  await db.prepare("CREATE TRIGGER fail_save BEFORE INSERT ON merchandise_collections BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(saveMerchandise(env, user, command), /injected_failure/);
  assert.equal((await listMerchandise(env, user)).revision, 0);
  await db.prepare("DROP TRIGGER fail_save").run();
  const results = await Promise.all([saveMerchandise(env, user, command), saveMerchandise(env, user, command)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].revision, 1);
  await assert.rejects(saveMerchandise(env, user, { ...command, requestId: crypto.randomUUID() }), /changed elsewhere/);
  const next = { ...command, expectedRevision: 1, requestId: crypto.randomUUID(), quantities: {} };
  await db.prepare("CREATE TRIGGER fail_update BEFORE UPDATE ON merchandise_collections BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(saveMerchandise(env, user, next), /injected_failure/);
  assert.deepEqual(await listMerchandise(env, user), results[0]);
  await db.prepare("DROP TRIGGER fail_update").run();
  assert.equal((await saveMerchandise(env, user, next)).revision, 2);
  await assert.rejects(saveMerchandise(env, user, command), /changed elsewhere/);
  console.log("Local D1 merchandise migration, rollback, concurrent retries and revision conflicts passed.");
} finally {
  await runtime?.dispose();
  rmSync(directory, { recursive: true, force: true });
}
