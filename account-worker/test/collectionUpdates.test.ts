import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {updateCollection, listCollection, undoCollectionTransaction} from '../src/collection';
import type {AuthUser,Env} from '../src/auth';
function fixture() {
 const db=new DatabaseSync(':memory:');
 const dir=new URL('../migrations/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file,dir),'utf8'));
 db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now')");
 let beforeBatch:(()=>void)|undefined; let reads=0;
 const prepare=(sql:string)=>{let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},async first(){reads++;return db.prepare(sql).get(...args as never[])??null;},async all(){reads++;return {results:db.prepare(sql).all(...args as never[])};},run(){return {meta:db.prepare(sql).run(...args as never[])}}};};
 const env={ASSET_BASE_URL:"https://catalog.test",ACCOUNT_DB:{prepare,async batch(statements:ReturnType<typeof prepare>[]){const hook=beforeBatch;beforeBatch=undefined;hook?.();db.exec('BEGIN');try{const result=statements.map(s=>s.run());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}}} as unknown as Env;
 const input=(requestId='request-0000000001',quantity=2)=>({requestId,mode:'add',source:'test',lines:[{cardUuid:'c',cardName:'Card',quantity}]});
 return {db,env,input,save:(value:unknown,user='a')=>updateCollection(env,{id:user} as AuthUser,value),beforeBatch(hook:()=>void){beforeBatch=hook;},reads:()=>reads};
}
test('lost responses and simultaneous duplicate retries apply once, even after later edits',async()=>{
 const f=fixture();try{
 const results=await Promise.all([f.save(f.input()),f.save(f.input())]);assert.deepEqual(results[0],results[1]);
 await f.save(f.input('request-0000000002',3));
 assert.deepEqual(await f.save(f.input()),results[0]);
 assert.equal(f.db.prepare('SELECT owned_quantity FROM collection_entries').get()!.owned_quantity,5);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_transactions').get()!.n,2);
 await assert.rejects(f.save(f.input('request-0000000001',7)),/different changes/);
 await f.save(f.input(),'b'); assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_entries').get()!.n,2);
 }finally{f.db.close();}
});
test('500-line request uses bulk reads and an atomic write, larger requests are rejected',async()=>{
 const f=fixture();try{
 const input={...f.input(),lines:Array.from({length:500},(_,i)=>({cardUuid:`c${i}`,cardName:`Card ${i}`,quantity:1}))};
 assert.equal((await f.save(input)).changed,500);assert.equal(f.reads(),3);
 await assert.rejects(f.save({...input,lines:[...input.lines,{cardUuid:'extra',cardName:'Extra',quantity:1}]}),/1–500/);
 }finally{f.db.close();}
});
test('concurrent inventory edits reject stale snapshots without recording an acknowledgement',async()=>{
 const f=fixture();try{
 f.beforeBatch(()=>f.db.exec("INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,proxy_quantity,updated_at) VALUES('a','c','Card',4,0,'now')"));
 await assert.rejects(f.save(f.input()),/Collection changed/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_update_receipts').get()!.n,0);
 await f.save(f.input());assert.equal(f.db.prepare('SELECT owned_quantity FROM collection_entries').get()!.owned_quantity,6);
 }finally{f.db.close();}
});
test('write failure rolls back every row and receipt, allowing the same batch to retry',async()=>{
 const f=fixture();try{
 f.db.exec("CREATE TRIGGER fail_test BEFORE INSERT ON collection_transactions BEGIN SELECT RAISE(ABORT,'test failure'); END");
 await assert.rejects(f.save(f.input()),/test failure/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_entries').get()!.n,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_update_receipts').get()!.n,0);
 f.db.exec('DROP TRIGGER fail_test');await f.save(f.input());
 assert.equal(f.db.prepare('SELECT owned_quantity FROM collection_entries').get()!.owned_quantity,2);
 }finally{f.db.close();}
});

test('finish pools are independent, retry-safe, and undo preserves other finishes', async () => {
 const f=fixture(); try {
 const lines=[{cardUuid:'c',cardName:'Card',quantity:2,finish:'foil'}, {cardUuid:'c',cardName:'Card',quantity:3,finish:'nonfoil'}, {cardUuid:'c',cardName:'Card',quantity:1}];
 const input={...f.input(),lines};
 const result=await f.save(input);
 assert.deepEqual(await f.save(input),result);
 const inventory=await listCollection(f.env,{id:'a'} as AuthUser);
 assert.deepEqual(inventory.entries.map(row=>[row.finish,row.ownedQuantity]).sort(),[['foil',2],['nonfoil',3],['unspecified',1]]);
 const second=await f.save({...f.input('request-0000000002'),lines:[{...lines[0],quantity:1}]});
 await undoCollectionTransaction(f.env,{id:'a'} as AuthUser,second.transactionId);
 assert.equal(f.db.prepare("SELECT owned_quantity FROM collection_entries WHERE finish='foil'").get()!.owned_quantity,2);
 assert.equal(f.db.prepare("SELECT owned_quantity FROM collection_entries WHERE finish='nonfoil'").get()!.owned_quantity,3);
 await assert.rejects(f.save({...f.input('request-0000000003'),lines:[{...lines[0],finish:'shiny'}]}),/finish/);
 await assert.rejects(f.save({...f.input('request-0000000004'),lines:[lines[0],lines[0]]}),/duplicate/);
 await assert.rejects(f.save({...f.input('request-0000000005'),lines:[lines[2],{...lines[2],finish:'unspecified'}]}),/duplicate/);
 } finally {f.db.close();}
});

test('same printing supports all finishes and finish-only concurrent changes reject the snapshot', async context => {
 const f=fixture();
 context.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({edition:['c','Card','SET','1']})));
 try {
 const line={cardUuid:'c',cardName:'Card',editionUuid:'edition',quantity:2,finish:'foil'};
 await f.save({...f.input(),lines:[line,{...line,finish:'nonfoil',quantity:4}]});
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_printing_entries').get()!.n,2);
 f.beforeBatch(()=>f.db.exec("UPDATE collection_printing_entries SET owned_quantity=3 WHERE finish='foil'"));
 await assert.rejects(f.save({...f.input('request-0000000002'),lines:[line]}),/Collection changed/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM collection_update_receipts').get()!.n,1);
 await f.save({...f.input('request-0000000002'),lines:[line]});
 assert.equal(f.db.prepare("SELECT owned_quantity FROM collection_printing_entries WHERE finish='foil'").get()!.owned_quantity,5);
 assert.equal(f.db.prepare("SELECT owned_quantity FROM collection_printing_entries WHERE finish='nonfoil'").get()!.owned_quantity,4);
 } finally {f.db.close();}
});

test('finish redistribution rolls back all pools and receipts on failure', async () => {
 const f=fixture(); try {
 await f.save(f.input());
 f.db.exec("CREATE TRIGGER fail_finish BEFORE INSERT ON collection_transactions BEGIN SELECT RAISE(ABORT,'finish failure'); END");
 const move={...f.input('request-0000000002'),mode:'set',lines:[{cardUuid:'c',cardName:'Card',quantity:0},{cardUuid:'c',cardName:'Card',quantity:2,finish:'foil'}]};
 await assert.rejects(f.save(move),/finish failure/);
 assert.deepEqual(f.db.prepare('SELECT finish,owned_quantity FROM collection_entries').all().map(row=>({...row})),[{finish:'unspecified',owned_quantity:2}]);
 f.db.exec('DROP TRIGGER fail_finish'); await f.save(move);
 assert.deepEqual(f.db.prepare('SELECT finish,owned_quantity FROM collection_entries').all().map(row=>({...row})),[{finish:'foil',owned_quantity:2}]);
 } finally {f.db.close();}
});

test('finish migration retains old inventory, proxies, listings, and transaction history', () => {
 const db=new DatabaseSync(':memory:');const dir=new URL('../migrations/',import.meta.url);
 try {
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')&&f<'0034').sort())db.exec(readFileSync(new URL(file,dir),'utf8'));
 db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'); INSERT INTO collection_entries VALUES('a','c','Card',3,2,'now'); INSERT INTO collection_printing_entries VALUES('a','c','Card','edition','SET','1',4,1,'now'); INSERT INTO binder_items(id,user_id,kind,card_uuid,card_name,quantity,updated_at) VALUES('b','a','available','c','Card',2,'now'); INSERT INTO collection_transactions VALUES('t','a','legacy','[]','now',NULL)");
 db.exec(readFileSync(new URL('0034_collection_finishes.sql',dir),'utf8'));
 assert.equal(db.prepare('SELECT finish FROM binder_items').get()!.finish,'unspecified');
 assert.deepEqual(db.prepare('SELECT owned_quantity,proxy_quantity,finish FROM collection_entries').all().map(row=>({...row})),[{owned_quantity:3,proxy_quantity:2,finish:'unspecified'}]);
 assert.equal(db.prepare('SELECT finish FROM collection_printing_entries').get()!.finish,'unspecified');
 assert.equal(db.prepare('SELECT source FROM collection_transactions').get()!.source,'legacy');
 db.exec("INSERT INTO collection_entries VALUES('a','c','Card',2,0,'now','foil')");
 assert.throws(()=>db.exec("INSERT INTO collection_entries VALUES('a','c','Card',1,0,'now','foil')"),/UNIQUE/);
 }finally{db.close();}
});
