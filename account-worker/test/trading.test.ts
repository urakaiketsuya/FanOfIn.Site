import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { updateTradeStatus } from "../src/trading";
import type { Env, AuthUser } from "../src/auth";

function fixture(printing = false, copies = 4, binderCount = 2) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE user_decks(id TEXT PRIMARY KEY);");
  for (const file of ["0008_collection.sql", "0019_collection_printings.sql", "0020_comments_and_binder.sql"]) {
    db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  let beforeBatch: (() => void) | undefined;
  const prepare = (sql: string) => {
    let args: (string | number | null)[] = [];
    return {
      bind(...values: typeof args) { args = values; return this; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      run() { return { meta: db.prepare(sql).run(...args) }; },
    };
  };
  const env = { ACCOUNT_DB: { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    const hook = beforeBatch; beforeBatch = undefined; hook?.();
    db.exec("BEGIN");
    try { const results = statements.map(statement => statement.run()); db.exec("COMMIT"); return results; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } } } as unknown as Env;
  db.exec("INSERT INTO users(id) VALUES('a'),('b'); INSERT INTO trades(id,sender_user_id,recipient_user_id,status,created_at,updated_at) VALUES('t','a','b','both_sent','now','now');");
  const table = printing ? "collection_printing_entries" : "collection_entries";
  if (printing) db.prepare("INSERT INTO collection_printing_entries(user_id,card_uuid,card_name,edition_uuid,owned_quantity,proxy_quantity,updated_at) VALUES('a','card','Card','edition',?,2,'now')").run(copies);
  else db.prepare("INSERT INTO collection_entries VALUES('a','card','Card',?,2,'now')").run(copies);
  const lines = Array.from({ length: binderCount }, (_, index) => ({ direction: "sender_gives", binderItemId: `item${index}`, cardUuid: "card", cardName: "Card", editionUuid: printing ? "edition" : null, setPrefix: null, collectorNumber: null, quantity: 1 }));
  for (const line of lines) db.prepare("INSERT INTO binder_items(id,user_id,kind,card_uuid,card_name,edition_uuid,quantity,updated_at) VALUES(?,'a','available','card','Card',?,?,'now')").run(line.binderItemId, line.editionUuid, Math.floor(copies / binderCount));
  db.prepare("INSERT INTO trade_revisions VALUES('t',1,'a','',?,'now')").run(JSON.stringify(lines));
  return { db, env, table, beforeBatch(hook: () => void) { beforeBatch = hook; },
    receive: (id: string) => updateTradeStatus(env, { id } as AuthUser, "t", "received"),
    quantities: () => db.prepare(`SELECT owned_quantity FROM ${table} ORDER BY user_id`).all().map(row => row.owned_quantity),
    count: (tableName: string) => Number(db.prepare(`SELECT count(*) n FROM ${tableName}`).get()!.n),
  };
}

for (const printing of [false, true]) test(`completion aggregates duplicate ${printing ? "printing" : "canonical"} lines`, async () => {
  const f = fixture(printing);
  try {
    await f.receive("a"); await f.receive("b");
    assert.deepEqual(f.quantities(), [2, 2]);
    assert.equal(f.count("collection_transactions"), 2);
    for (const row of f.db.prepare("SELECT changes_json FROM collection_transactions").all()) assert.equal(JSON.parse(String(row.changes_json)).length, 1);
    assert.equal(f.db.prepare(`SELECT proxy_quantity FROM ${f.table} WHERE user_id='a'`).get()!.proxy_quantity, 2);
  } finally { f.db.close(); }
});

test("simultaneous receipts and retries apply completion exactly once", async () => {
  const f = fixture(false, 4, 1);
  try {
    await Promise.all([f.receive("a"), f.receive("b")]);
    await Promise.all([f.receive("a"), f.receive("b")]);
    assert.deepEqual(f.quantities(), [3, 1]);
    assert.equal(f.db.prepare("SELECT quantity FROM binder_items").get()!.quantity, 3);
    assert.equal(f.db.prepare("SELECT count(*) n FROM trade_events WHERE event_type='completed'").get()!.n, 1);
    assert.equal(f.count("collection_transactions"), 2);
  } finally { f.db.close(); }
});

test("concurrent inventory edit prevents all completion side effects and can be retried", async () => {
  const f = fixture();
  try {
    await f.receive("a");
    f.beforeBatch(() => f.db.exec("UPDATE collection_entries SET owned_quantity=5 WHERE user_id='a'"));
    await assert.rejects(f.receive("b"), /inventory changed/);
    assert.deepEqual(f.quantities(), [5]);
    assert.equal(f.count("collection_transactions"), 0);
    assert.equal(f.db.prepare("SELECT status FROM trades").get()!.status, "both_sent");
    await f.receive("b");
    assert.deepEqual(f.quantities(), [3, 2]);
  } finally { f.db.close(); }
});

test("a failure during completion rolls back the claim and all inventory writes", async () => {
  const f = fixture();
  try {
    await f.receive("a");
    f.db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON collection_transactions BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(f.receive("b"), /test failure/);
    assert.deepEqual(f.quantities(), [4]);
    assert.equal(f.db.prepare("SELECT status FROM trades").get()!.status, "both_sent");
    assert.equal(f.db.prepare("SELECT count(*) n FROM trade_events WHERE event_type='completed'").get()!.n, 0);
    f.db.exec("DROP TRIGGER fail_audit"); await f.receive("b");
    assert.deepEqual(f.quantities(), [2, 2]);
  } finally { f.db.close(); }
});

test("simultaneous receipts can exhaust binder and collection without a retry error", async () => {
  const f = fixture(false, 2, 2);
  try {
    await Promise.all([f.receive("a"), f.receive("b")]);
    assert.deepEqual(f.quantities(), [0, 2]);
    assert.equal(f.count("binder_items"), 0);
    assert.equal(f.count("collection_transactions"), 2);
  } finally { f.db.close(); }
});
