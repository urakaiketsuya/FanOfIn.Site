import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {OmnidexEvent,OmnidexPairingsResponse} from '@gatcg/shared';
import {fetchStagePairings,missingStagePairings} from './stagePairings.js';
const event={id:1,swissRounds:12,stages:[{id:1,status:'complete',type:'swiss'},{id:2,status:'complete',type:'single-elimination'}]} as OmnidexEvent;
const round=(stage:number,id:number,total=2)=>({stage:{id:stage},round:{id,total},pairings:[{id:1,status:'complete',pairing:[{id:10,status:'winner'},{id:20,status:'loser'}]}]}) as unknown as OmnidexPairingsResponse;
test('recovers missing Swiss stage, preserves cut, follows actual totals and is idempotent',async()=>{
 const existing=[round(2,1),round(2,2)];const calls:number[][]=[];
 assert.equal(missingStagePairings(event,existing),true);
 const result=await fetchStagePairings(event,existing,async(e,r,s)=>{calls.push([e,r,s]);return round(s,r,3);});
 assert.equal(result.length,5);assert.deepEqual(calls,[[1,1,1],[1,2,1],[1,3,1]]);assert.equal(missingStagePairings(event,result),false);
 assert.deepEqual(await fetchStagePairings(event,result,async()=>{throw Error('must not fetch');}),result);
});
test('rejects wrong-stage response and failures without mutating saved rounds; retry succeeds',async()=>{
 const existing=[round(2,1),round(2,2)];const original=JSON.stringify(existing);
 await assert.rejects(fetchStagePairings(event,existing,async()=>round(2,1)),/Mismatched/);
 await assert.rejects(fetchStagePairings(event,existing,async(_,r,s)=>r===2?{error:'Unavailable'}:round(s,r)),/Unavailable/);
 assert.equal(JSON.stringify(existing),original);
 assert.equal((await fetchStagePairings(event,existing,async(_,r,s)=>round(s,r))).length,4);
});
test('repairs holes, deduplicates cached rounds and keeps fast snapshots marked incomplete',async()=>{
 const result=await fetchStagePairings(event,[round(1,1,3),round(1,3,3),round(1,3,3),round(2,1),round(2,2)],async(_,r,s)=>{assert.equal(r,2);return round(s,r,3);});
 assert.equal(result.length,5);assert.equal(missingStagePairings(event,result),false);
 const fast=await fetchStagePairings(event,[],async(_,r,s)=>round(s,r),true);assert.equal(fast.length,2);assert.equal(missingStagePairings(event,fast),true);
});
test('rejects missing round totals and leaves unknown-stage legacy bundles untouched',async()=>{
 await assert.rejects(fetchStagePairings(event,[],async()=>({stage:1,round:1,pairings:[]})),/Invalid round total/);
 assert.deepEqual(await fetchStagePairings({...event,stages:[]},[],async()=>{throw Error('unexpected');}),[]);
});
