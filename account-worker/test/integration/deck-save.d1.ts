import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { saveDeck, createDeckVersion, getDeck, listDecks } from "../../src/decks";
import { parseSaveInput } from "../../src/deck-input";
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
  const input = parseSaveInput({ title: "Local D1 test", format: "STANDARD", decklist: { main: [{ card: "First", quantity: 4 }], material: [], sideboard: [] }, source: { provider: "manual", externalDeckId: "one", label: "Manual" } });
  const { id } = await saveDeck(env, user, input);
  const before = (await getDeck(env, user, id))!;
  const command = { decklist: { ...input.decklist, main: [{ card: "Second", quantity: 4 }] }, format: "STANDARD", expectedRevision: before.revision, requestId: crypto.randomUUID(), maybeboard: [{ card: "Maybe", quantity: 1 }] };
  await db.prepare("CREATE TRIGGER fail_save BEFORE UPDATE ON saved_decks BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(createDeckVersion(env, user, id, command), /injected_failure/);
  assert.deepEqual(await getDeck(env, user, id), before);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM deck_save_receipts").first<{ count: number }>())!.count, 0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM canonical_builds").first<{ count: number }>())!.count, 1);
  await db.prepare("DROP TRIGGER fail_save").run();
  const results = await Promise.all([createDeckVersion(env, user, id, command), createDeckVersion(env, user, id, command)]);
  assert.deepEqual(results[0], results[1]);
  const after = (await getDeck(env, user, id))!;
  assert.equal(after.versionCount, 2);
  assert.deepEqual(after.maybeboard, command.maybeboard);
  assert.deepEqual((await listDecks(env, user))[0].decklist, after.decklist);
  await assert.rejects(createDeckVersion(env, user, id, { ...command, requestId: crypto.randomUUID() }), /changed elsewhere/);
  console.log("Local D1: migrations, batch rollback, retry receipts, concurrent retries, and revision conflicts passed.");
} finally {
  await runtime?.dispose();
  rmSync(directory, { recursive: true, force: true });
}
