import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionKey,constructionSimilarity,mineConstructionCohort,splitConstruction,type ConstructionDeck} from './constructionPackages.js';
const key=(name:string)=>constructionKey({name,section:'main'});
function fixture():ConstructionDeck[]{return Array.from({length:120},(_,i)=>{
 const counts=new Map([[key('Always'),4],[key('Background'),40],[key(`Variation ${i%3}`),1]]);
 if(i%2===0){counts.set(key('A'),3);counts.set(key('B'),2);counts.set(key('C'),1);}
 else counts.set(key('Replacement'),6);
 return {id:String(i),player:String(i),event:String(Math.floor(i/10)),date:`2026-01-${String(Math.floor(i/10)+1).padStart(2,'0')}`,counts};
});}
test('discovers optional multi-card construction and preserves held-out dates',()=>{
 const decks=fixture(),split=splitConstruction(decks);
 assert.ok(split.discovery.every(d=>d.date<split.starts));assert.ok(split.validation.every(d=>d.date>=split.starts));
 const results=mineConstructionCohort(decks);
 assert.ok(results.length);const r=results.find(r=>r.cards.includes('A'))!;
 assert.deepEqual(r.cards,['A','B','C']);assert.ok(!r.cards.includes('Always'));
 assert.equal(r.slots.main,6);assert.equal(r.validation.status,'repeated');assert.ok(r.examples[0].similarity>=.75);
 assert.deepEqual(mineConstructionCohort([...decks,...decks]),results);
});
test('later data does not nominate groups or determine discovery scores',()=>{
 const decks=fixture();const {starts}=splitConstruction(decks);
 const changed=decks.map(d=>d.date>=starts?{...d,counts:new Map([[key('Always'),4]])}:d);
 const a=mineConstructionCohort(decks)[0], b=mineConstructionCohort(changed)[0];
 assert.deepEqual(a.core,b.core);assert.deepEqual(a.discovery,b.discovery);assert.equal(b.validation.status,'not-repeated');
});
test('one repeated player is insufficient and unrelated lists cannot supply matches',()=>{
 assert.deepEqual(mineConstructionCohort(fixture().map(d=>({...d,player:'one'}))),[]);
 assert.equal(constructionSimilarity({ ...fixture()[0],counts:new Map([[key('A'),4]]) },{...fixture()[1],counts:new Map([[key('B'),4]])},new Set()),0);
});

test('discovery rejects a perfectly associated group below the independent-player floor',()=>{
 const decks=fixture().map((d,i)=>({...d,player:i%2===0?`shared-${Math.floor(i/2)%14}`:d.player}));
 assert.equal(mineConstructionCohort(decks).some(r=>r.cards.includes('A')),false);
});
