import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareCollectionBatch,acknowledgeCollectionBatch,sendCollectionBatch,type CollectionSaveQueue} from '../src/features/collection/collectionSaveQueue';
const queue=():CollectionSaveQueue=>({drafts:Object.fromEntries(Array.from({length:251},(_,i)=>[String(i),{cardUuid:String(i),cardName:`Card ${i}`,quantity:4}])),pending:null});
test('large saves preserve remaining changes and resume the same persisted request after interruption',()=>{
 let state=prepareCollectionBatch(queue(),'request-one');assert.equal(Object.keys(state.pending!.lines).length,100);
 state=JSON.parse(JSON.stringify(state));state=prepareCollectionBatch(state,'do-not-use');assert.equal(state.pending!.requestId,'request-one');
 state=acknowledgeCollectionBatch(state,'request-one');assert.equal(Object.keys(state.drafts).length,151);
 state=prepareCollectionBatch(state,'request-two');state=acknowledgeCollectionBatch(state,'request-two');assert.equal(Object.keys(state.drafts).length,51);
 state=prepareCollectionBatch(state,'request-three');state=acknowledgeCollectionBatch(state,'request-three');assert.deepEqual(state,{drafts:{},pending:null});
});
test('acknowledgement never removes a newer edit or another request',()=>{
 const state=prepareCollectionBatch(queue(),'one');state.drafts={...state.drafts,'0':{...state.drafts['0'],quantity:7}};
 assert.equal(acknowledgeCollectionBatch(state,'other'),state);
 assert.equal(acknowledgeCollectionBatch(state,'one').drafts['0'].quantity,7);
});
test('bounded retries recover network failures but retain validation and authentication errors',async()=>{
 let count=0;await sendCollectionBatch(async()=>{if(++count<3)throw new TypeError('Network interrupted');},async()=>{});assert.equal(count,3);
 count=0;await assert.rejects(sendCollectionBatch(async()=>{count++;throw {status:400};},async()=>{}));assert.equal(count,1);
 count=0;await assert.rejects(sendCollectionBatch(async()=>{count++;throw new Error('Offline');},async()=>{}));assert.equal(count,3);
});

test('invalid recovered queue is rejected instead of sending malformed updates',async()=>{
 const {parseCollectionQueue}=await import('../src/features/collection/collectionSaveQueue');
 assert.throws(()=>parseCollectionQueue({drafts:{bad:{quantity:-1}},pending:null}));
 assert.throws(()=>parseCollectionQueue({drafts:{},pending:{requestId:'bad',lines:{}}}));
 assert.deepEqual(parseCollectionQueue(queue()),queue());
});
