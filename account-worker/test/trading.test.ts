import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { counterTrade, updateTradeStatus, createBinderItem, updateBinderItem } from "../src/trading";
import type { Env, AuthUser } from "../src/auth";

function fixture(printing = false, copies = 4, binderCount = 2, finish = "unspecified") {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE user_decks(id TEXT PRIMARY KEY,owner_user_id TEXT);");
  for (const file of ["0008_collection.sql", "0019_collection_printings.sql", "0020_comments_and_binder.sql", "0022_collection_tracking.sql", "0023_card_locations.sql", "0024_trade_allocations.sql", "0025_collection_update_receipts.sql", "0034_collection_finishes.sql"]) {
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
  else db.prepare("INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,proxy_quantity,updated_at) VALUES('a','card','Card',?,2,'now')").run(copies);
  db.prepare(`UPDATE ${table} SET finish=?`).run(finish);
  const lines = Array.from({ length: binderCount }, (_, index) => ({ direction: "sender_gives", binderItemId: `item${index}`, cardUuid: "card", cardName: "Card", editionUuid: printing ? "edition" : null, setPrefix: null, collectorNumber: null, quantity: 1, ...(finish !== "unspecified" ? { finish } : {}) }));
  for (const line of lines) db.prepare("INSERT INTO binder_items(id,user_id,kind,card_uuid,card_name,edition_uuid,quantity,updated_at,finish) VALUES(?,'a','available','card','Card',?,?,'now',?)").run(line.binderItemId, line.editionUuid, Math.floor(copies / binderCount), finish);
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


test("acceptance reserves copies against loans, assignments, and collection reductions", async()=>{
 const f=fixture(false,4,1); f.db.exec("UPDATE trades SET status='sent'; INSERT INTO user_decks VALUES('deck','a');");
 await updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','accepted');
 assert.throws(()=>f.db.exec(`INSERT INTO collection_card_tracking(user_id,card_uuid,card_name,might_own,loans_json,assignments_json,revision,updated_at) VALUES('a','card','Card',0,'[]','[{"deckId":"deck","quantity":4}]',1,'now')`),/reserve/);
 assert.throws(()=>f.db.exec("UPDATE collection_entries SET owned_quantity=0 WHERE user_id='a'"),/reserve/);
 assert.throws(()=>f.db.exec("UPDATE binder_items SET card_uuid='other'"),/Reserved/);
 assert.throws(()=>f.db.exec("DELETE FROM binder_items"),/reserves/);
});
test("a loan created between availability read and acceptance prevents the reservation atomically",async()=>{
 const f=fixture(false,4,1);f.db.exec("UPDATE trades SET status='sent'");
 f.beforeBatch(()=>f.db.exec(`INSERT INTO collection_card_tracking(user_id,card_uuid,card_name,might_own,loans_json,assignments_json,revision,updated_at) VALUES('a','card','Card',0,'[{"id":"loan","borrower":"Sam","quantity":4,"lentAt":"2026-09-01"}]','[]',1,'now')`));
 await assert.rejects(updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','accepted'),/assigned, lent/);
 assert.equal(f.db.prepare("SELECT status FROM trades WHERE id='t'").get()!.status,'sent');
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM trade_card_reservations").get()!.n,0);
});
test("disputes retain reservations and cancelled trades release them",async()=>{
 const f=fixture(false,4,1); f.db.exec("UPDATE trades SET status='sent'");
 await updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','accepted');
 await updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','disputed');
 assert.equal(f.db.prepare("SELECT SUM(quantity) n FROM trade_card_reservations").get()!.n,1);
 const g=fixture(false,4,1);g.db.exec("UPDATE trades SET status='sent'");
 await updateTradeStatus(g.env,{id:'b'} as AuthUser,'t','accepted');
 await updateTradeStatus(g.env,{id:'b'} as AuthUser,'t','cancelled');
 assert.equal(g.db.prepare("SELECT COUNT(*) n FROM trade_card_reservations").get()!.n,0);
});


test("counteroffer cannot release a concurrently accepted reservation", async () => {
  const f = fixture(false, 4, 1);
  try {
    f.db.exec("UPDATE trades SET status='sent' WHERE id='t'");
    f.beforeBatch(() => f.db.exec("UPDATE trades SET status='accepted' WHERE id='t'"));
    await assert.rejects(counterTrade(f.env, { id: "b" } as AuthUser, "t", {
      lines: [{ direction: "sender_gives", binderItemId: "item0", quantity: 1 }],
    }), /Trade changed/);
    assert.equal(f.db.prepare("SELECT status FROM trades").get()!.status, "accepted");
    assert.equal(f.count("trade_revisions"), 1);
    assert.equal(f.count("trade_events"), 0);
  } finally { f.db.close(); }
});

for (const printing of [false,true]) test(`foil trade completion preserves nonfoil ${printing?'printing':'canonical'} copies`,async()=>{
 const f=fixture(printing,4,1,'foil');try {
 if(printing)f.db.exec("INSERT INTO collection_printing_entries(user_id,card_uuid,card_name,edition_uuid,owned_quantity,updated_at,finish) VALUES('a','card','Card','edition',7,'now','nonfoil')");
 else f.db.exec("INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,updated_at,finish) VALUES('a','card','Card',7,'now','nonfoil')");
 await f.receive('a');await f.receive('b');await f.receive('b');
 assert.equal(f.db.prepare(`SELECT owned_quantity FROM ${f.table} WHERE user_id='a' AND finish='foil'`).get()!.owned_quantity,3);
 assert.equal(f.db.prepare(`SELECT owned_quantity FROM ${f.table} WHERE user_id='a' AND finish='nonfoil'`).get()!.owned_quantity,7);
 assert.equal(f.db.prepare(`SELECT owned_quantity FROM ${f.table} WHERE user_id='b' AND finish='foil'`).get()!.owned_quantity,1);
 assert.equal(JSON.parse(String(f.db.prepare("SELECT changes_json FROM collection_transactions WHERE user_id='b'").get()!.changes_json))[0].finish,'foil');
 }finally{f.db.close();}
});

test('accepted foil reservations cannot change finish or consume nonfoil copies',async()=>{
 const f=fixture(false,2,1,'foil');try{
 f.db.exec("UPDATE trades SET status='sent'; INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,updated_at,finish) VALUES('a','card','Card',9,'now','nonfoil')");
 await updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','accepted');
 assert.throws(()=>f.db.exec("UPDATE binder_items SET finish='nonfoil'"),/Reserved/);
 assert.throws(()=>f.db.exec("UPDATE collection_entries SET owned_quantity=0 WHERE finish='foil'"),/reserve/);
 f.db.exec("UPDATE collection_entries SET owned_quantity=0 WHERE finish='nonfoil'");
 assert.equal(f.db.prepare('SELECT finish FROM trade_card_reservations').get()!.finish,'foil');
 }finally{f.db.close();}
});

test('changing finish after an offer requires a new offer before acceptance',async()=>{
 const f=fixture(false,2,1,'foil');try{
 f.db.exec("UPDATE trades SET status='sent'; INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,updated_at,finish) VALUES('a','card','Card',2,'now','nonfoil'); UPDATE binder_items SET finish='nonfoil'");
 await assert.rejects(updateTradeStatus(f.env,{id:'b'} as AuthUser,'t','accepted'),/changed/);
 assert.equal(f.db.prepare('SELECT status FROM trades').get()!.status,'sent');
 }finally{f.db.close();}
});

test('binder mutations persist finish and enforce the exact owned finish pool',async()=>{
 const f=fixture(false,4,1,'foil');try{
 f.db.exec("UPDATE trades SET status='cancelled'; DELETE FROM binder_items");
 const item={kind:'available',cardUuid:'card',cardName:'Card',editionUuid:null,quantity:2,finish:'foil'};
 const created=await createBinderItem(f.env,{id:'a'} as AuthUser,item);
 assert.equal(f.db.prepare('SELECT finish FROM binder_items WHERE id=?').get(created.id)!.finish,'foil');
 await assert.rejects(createBinderItem(f.env,{id:'a'} as AuthUser,{...item,finish:'nonfoil'}),/collection quantity/);
 await assert.rejects(createBinderItem(f.env,{id:'a'} as AuthUser,{...item,quantity:3}),/collection quantity/);
 await assert.rejects(updateBinderItem(f.env,{id:'a'} as AuthUser,created.id,{...item,finish:'nonfoil'}),/collection quantity/);
 const wanted=await createBinderItem(f.env,{id:'a'} as AuthUser,{...item,kind:'wanted'});
 await updateBinderItem(f.env,{id:'a'} as AuthUser,wanted.id,{...item,kind:'wanted',finish:'nonfoil'});
 assert.equal(f.db.prepare('SELECT finish FROM binder_items WHERE id=?').get(wanted.id)!.finish,'nonfoil');
 await assert.rejects(createBinderItem(f.env,{id:'a'} as AuthUser,{...item,finish:'shiny'}),/finish/);
 }finally{f.db.close();}
});
