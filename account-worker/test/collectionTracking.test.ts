import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { listCollectionTracking, saveCollectionTracking } from "../src/collectionTracking";
import type { AuthUser, Env } from "../src/auth";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('a'),('b');");
  db.exec(readFileSync(new URL("../migrations/0022_collection_tracking.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0023_card_locations.sql",import.meta.url),"utf8"));
  db.exec("CREATE TABLE collection_entries(user_id TEXT,card_uuid TEXT,owned_quantity INTEGER); CREATE TABLE collection_printing_entries(user_id TEXT,card_uuid TEXT,owned_quantity INTEGER); CREATE TABLE user_decks(id TEXT PRIMARY KEY,owner_user_id TEXT); INSERT INTO collection_entries VALUES('a','card',4); INSERT INTO user_decks VALUES('deck-a','a'),('deck-b','a'),('foreign','b');");
  db.exec("ALTER TABLE collection_printing_entries ADD COLUMN edition_uuid TEXT;");
  for (const file of ["0020_comments_and_binder.sql","0024_trade_allocations.sql"]) db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),"utf8"));
  const env = {ACCOUNT_DB:{prepare(sql: string) {
    let args: (string|number|null)[] = [];
    return {bind(...values: typeof args) {args=values;return this;}, async all(){return {results:db.prepare(sql).all(...args)};}, async run(){return {meta:db.prepare(sql).run(...args)};}};
  }}} as unknown as Env;
  const user = {id:"a"} as AuthUser;
  const input = {cardName:"Dungeon Guide",mightOwn:true,revision:0,loans:[{id:"loan",borrower:"A friend",quantity:2,lentAt:"2026-09-27T12:00:00.000Z"}]};
  return {db,env,user,input};
}
test("tracking persists without owned entries and is private to its user",async()=>{
  const {db,env,user,input}=fixture();
  db.exec("DELETE FROM collection_entries");
  const saved=await saveCollectionTracking(env,user,"card",{...input,loans:[]});
  assert.equal(saved.revision,1);
  assert.equal((await listCollectionTracking(env,user))[0].mightOwn,true);
  assert.deepEqual(await listCollectionTracking(env,{id:"b"} as AuthUser),[]);
  db.exec("DELETE FROM users WHERE id='a'");
  assert.deepEqual(await listCollectionTracking(env,user),[]);
});
test("loans can be returned and reopened without deleting history or the uncertainty flag",async()=>{
  const {env,user,input}=fixture();
  await saveCollectionTracking(env,user,"card",input);
  const returned=await saveCollectionTracking(env,user,"card",{...input,revision:1,loans:[{...input.loans[0],returnedAt:"2026-09-28T12:00:00.000Z"}]});
  assert.ok(returned.loans[0].returnedAt); assert.equal(returned.mightOwn,true);
  const reopened=await saveCollectionTracking(env,user,"card",{...input,revision:2});
  assert.equal(reopened.loans[0].returnedAt,undefined);
});
test("stale edits and another user's revision cannot overwrite notes",async()=>{
  const {env,user,input}=fixture();
  await saveCollectionTracking(env,user,"card",input);
  await assert.rejects(saveCollectionTracking(env,user,"card",input),/another tab/);
  await assert.rejects(saveCollectionTracking(env,{id:"b"} as AuthUser,"card",{...input,revision:1}),/another tab/);
  assert.equal((await listCollectionTracking(env,user))[0].revision,1);
});
test("invalid borrowers, quantities, duplicate loans and dates are rejected",async()=>{
  const {env,user,input}=fixture();
  for(const loan of [{...input.loans[0],borrower:" "},{...input.loans[0],quantity:0},{...input.loans[0],quantity:1.5},{...input.loans[0],lentAt:"invalid"},{...input.loans[0],returnedAt:"2020-01-01"}]) await assert.rejects(saveCollectionTracking(env,user,"card",{...input,loans:[loan]}));
  await assert.rejects(saveCollectionTracking(env,user,"card",{...input,loans:[input.loans[0],input.loans[0]]}));
  assert.deepEqual(await listCollectionTracking(env,user),[]);
});

test("assignments conserve pooled copies, include loans, and reject private foreign decks",async()=>{
 const {db,env,user,input}=fixture();
 db.exec("INSERT INTO collection_printing_entries(user_id,card_uuid,owned_quantity) VALUES('a','card',1)");
 const first=await saveCollectionTracking(env,user,"card",{...input,assignments:[{deckId:'deck-a',quantity:3}]});
 assert.equal(first.assignments?.[0].quantity,3);
 await assert.rejects(saveCollectionTracking(env,user,"card",{...input,revision:1,assignments:[{deckId:'deck-a',quantity:4}]}),/exceed ownership/);
 await assert.rejects(saveCollectionTracking(env,user,"card",{...input,revision:1,assignments:[{deckId:'foreign',quantity:1}]}));
 const moved=await saveCollectionTracking(env,user,"card",{...input,revision:1,assignments:[{deckId:'deck-b',quantity:3}]});
 assert.deepEqual(moved.assignments,[{deckId:'deck-b',quantity:3}]);
 await assert.rejects(saveCollectionTracking(env,user,"card",{...input,revision:1,assignments:[{deckId:'deck-a',quantity:3}]}),/another tab/);
});
test("legacy excess can be reconciled without silently changing inventory or loans",async()=>{
 const {db,env,user,input}=fixture();
 await saveCollectionTracking(env,user,"card",{...input,assignments:[{deckId:'deck-a',quantity:2}]});
 db.exec("UPDATE collection_entries SET owned_quantity=1");
 const notes=await saveCollectionTracking(env,user,"card",{...input,revision:1,mightOwn:false});
 assert.equal(notes.assignments?.[0].quantity,2);
 await assert.rejects(saveCollectionTracking(env,user,"card",{...input,revision:2,assignments:[{deckId:'deck-b',quantity:3}]}));
 const reduced=await saveCollectionTracking(env,user,"card",{...input,revision:2,assignments:[],loans:[]});
 assert.deepEqual(reduced.assignments,[]);
});
