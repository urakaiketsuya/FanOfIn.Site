import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {updateCollection} from '../src/collection';
import type {AuthUser,Env} from '../src/auth';
function fixture() {
 const db=new DatabaseSync(':memory:');
 const dir=new URL('../migrations/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file,dir),'utf8'));
 db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now')");
 let beforeBatch:(()=>void)|undefined; let reads=0;
 const prepare=(sql:string)=>{let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},async first(){reads++;return db.prepare(sql).get(...args as never[])??null;},async all(){reads++;return {results:db.prepare(sql).all(...args as never[])};},run(){return {meta:db.prepare(sql).run(...args as never[])}}};};
 const env={ACCOUNT_DB:{prepare,async batch(statements:ReturnType<typeof prepare>[]){const hook=beforeBatch;beforeBatch=undefined;hook?.();db.exec('BEGIN');try{const result=statements.map(s=>s.run());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}}} as unknown as Env;
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
 f.beforeBatch(()=>f.db.exec("INSERT INTO collection_entries VALUES('a','c','Card',4,0,'now')"));
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
