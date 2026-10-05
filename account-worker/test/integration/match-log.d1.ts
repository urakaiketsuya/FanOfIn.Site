import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { saveDeck } from "../../src/decks";
import { parseSaveInput } from "../../src/deck-input";
import { upsertMatchLog, listMatchLog, deleteMatchLogRecord } from "../../src/match-log";
import type { AuthUser, Env } from "../../src/auth";

const directory = mkdtempSync(join(tmpdir(), "fanofin-match-log-"));
let runtime: Miniflare | undefined;
try {
  execFileSync(process.execPath, ["../node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "fanofin-accounts-dev", "--local", "--persist-to", directory],
    { cwd: new URL("../../", import.meta.url), env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: join(directory, "wrangler.log") }, stdio: "pipe" });
  runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: "export default { fetch() { return new Response('test'); } }", compatibilityDate: "2026-08-24",
    d1Databases: { ACCOUNT_DB: "replace-with-development-d1-id" }, resourcePersistencePath: join(directory, "v3") }));
  const db = await runtime.getD1Database("ACCOUNT_DB");
  const env = { ACCOUNT_DB: db } as unknown as Env;
  for (const id of ["a", "b"]) await db.prepare("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(id,id,`${id}@test`,id,"now","now").run();
  const user = { id: "a" } as AuthUser;
  const record = (id: string) => ({ version: 1, id, playedAt: "2026-10-05T12:00:00Z", result: "win", order: "first", turns: null, mulligans: null, opponent: "", deckLabel: "", sideboardPlan: "", gamePlanTurn: null, notableCards: [], bottlenecks: [], notes: "", provenance: { kind: "manual", enteredAt: "2026-10-05T12:00:00Z" } });
  const foreign = await saveDeck(env, {id:"b"} as AuthUser, parseSaveInput({ title: "Other account", source: { provider: "manual", externalDeckId: "test", label: "Manual" }, format: "STANDARD", decklist: {main:[{card:"First",quantity:4}],material:[],sideboard:[]} }));
  await assert.rejects(upsertMatchLog(env,user,{records:[record("one"),{...record("two"),savedDeckId:foreign.id}]}), /outside this account/);
  await assert.rejects(db.prepare("INSERT INTO match_log_records(user_id,id,saved_deck_id,played_at,provenance_kind,payload_json,created_at,updated_at) VALUES('a','bad',?,'now','manual','{}','now','now')").bind(foreign.id).run(), /another account/);
  assert.equal((await listMatchLog(env,user)).length,0);
  await db.prepare("CREATE TRIGGER fail_match BEFORE INSERT ON match_log_records WHEN NEW.id = 'two' BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(upsertMatchLog(env,user,{records:[record("one"),record("two")]}), /injected_failure/);
  assert.equal((await listMatchLog(env,user)).length,0);
  await db.prepare("DROP TRIGGER fail_match").run();
  await Promise.all([upsertMatchLog(env,user,{records:[record("one"),record("two")]}),upsertMatchLog(env,user,{records:[record("one"),record("two")]})]);
  assert.equal((await listMatchLog(env,user)).length,2);
  assert.equal((await listMatchLog(env,{id:"b"} as AuthUser)).length,0);
  await db.prepare("CREATE TRIGGER fail_delete BEFORE DELETE ON match_log_records BEGIN SELECT RAISE(ABORT, 'delete_failure'); END").run();
  await assert.rejects(deleteMatchLogRecord(env,user,"one"), /delete_failure/);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM match_log_deletions").first<{count:number}>())!.count,0);
  assert.equal((await listMatchLog(env,user)).length,2);
  await db.prepare("DROP TRIGGER fail_delete").run();
  await deleteMatchLogRecord(env,user,"one");
  await deleteMatchLogRecord(env,user,"one");
  await assert.rejects(upsertMatchLog(env,user,{records:[record("three"),record("one")]}), /deleted/);
  assert.deepEqual((await listMatchLog(env,user)).map(r=>r.id),["two"]);
  await upsertMatchLog(env,{id:"b"} as AuthUser,{records:[record("one")]});
  await Promise.allSettled([deleteMatchLogRecord(env,user,"two"),upsertMatchLog(env,user,{records:[record("two")]})]);
  assert.equal((await listMatchLog(env,user)).length,0);
  console.log("Match log D1: migration, atomic rollback, concurrent retries, account isolation, deletion retry and stale resurrection tests passed.");
} finally { await runtime?.dispose(); rmSync(directory,{recursive:true,force:true}); }
