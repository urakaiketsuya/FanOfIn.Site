import test from 'node:test';
import assert from 'node:assert/strict';
import { metaFreshness, type DeckCardIndexData, type DeckPopularityEntry, type OmnidexEventSummary, type ArchetypeTaxonomyData } from '@gatcg/shared';
const events = [{id:1,date:'2026-10-20',format:'standard',status:'complete'},{id:2,date:'2026-09-30',format:'standard',status:'complete'}] as OmnidexEventSummary[];
function fixture(changed=false) {
 const entries = Array.from({length:6},(_,i)=>({deckId:`${i<3?1:2}:${i}`,eventId:i<3?1:2,player:i,championName:'Rai'})) as DeckPopularityEntry[];
 const index:DeckCardIndexData={generatedAt:'2026-10-30',cardNames:['Champion','Old','New','Side'],decks:entries.map((e,i)=>({deckId:e.deckId,material:[[0,1]],main:[[changed&&i<3?2:1,4]],sideboard:i<3?[[3,4]]:[]}))};
 const taxonomy={clusters:[{id:'a',name:'Rai A',championName:'Rai',deckIds:entries.map(e=>e.deckId)}]} as ArchetypeTaxonomyData;
 return {entries,index,taxonomy};
}
const scope={format:'standard',champion:'',days:30 as const};
test('stable builds and cards stay stable despite sideboard changes and duplicates',()=>{
 const {index,entries,taxonomy}=fixture();
 const r=metaFreshness({...index,decks:[...index.decks,index.decks[0]]},[...entries,entries[0]],events,taxonomy,scope,'2026-10-30');
 assert.equal(r.current.decks,3); assert.equal(r.returning,100); assert.equal(r.cardChange,0); assert.equal(r.current.concentration,100);
});
test('card changes within a stable build remain visible, combined sections count once',()=>{
 const {index,entries,taxonomy}=fixture(true);
 const r=metaFreshness(index,entries,events,taxonomy,scope,'2026-10-30');
 assert.equal(r.returning,100); assert.ok(Math.abs(r.cardChange!-200/3)<0.001);
});
test('new builds, missing lists and ambiguous memberships do not imply freshness',()=>{
 const {index,entries,taxonomy}=fixture();
 taxonomy.clusters.push({...taxonomy.clusters[0],id:'b',deckIds:[entries[0].deckId]});
 index.decks=index.decks.filter(d=>d.deckId!==entries[1].deckId);
 const r=metaFreshness(index,entries,events,taxonomy,scope,'2026-10-30');
 assert.equal(r.current.recorded,3); assert.equal(r.current.decks,2); assert.equal(r.current.classified,1); assert.equal(r.returning,50); assert.equal(r.cardChange,null);
 const empty=metaFreshness(index,entries,events,taxonomy,{...scope,format:'draft'},'2026-10-30');
 assert.equal(empty.returning,null); assert.equal(empty.current.concentration,null);
});
test('exact period boundary belongs to previous; future and incomplete events excluded',()=>{
 const {index,entries,taxonomy}=fixture();
 const boundary=metaFreshness(index,entries,events,taxonomy,scope,'2026-10-30');
 assert.equal(boundary.previous.decks,3);
 const future=metaFreshness(index,entries,events.map(e=>({...e,date:'2026-11-01'})),taxonomy,scope,'2026-10-30');
 assert.equal(future.current.decks,0);
 const noPrior=metaFreshness(index,entries,events.filter(e=>e.id===1),taxonomy,scope,'2026-10-30');
 assert.equal(noPrior.returning,null); assert.equal(noPrior.cardChange,null); assert.equal(noPrior.builds[0].previousShare,null);
});
test('a newly observed build has zero returning share and a positive share shift',()=>{
 const {index,entries,taxonomy}=fixture();
 taxonomy.clusters[0].deckIds=entries.slice(3).map(e=>e.deckId);
 taxonomy.clusters.push({...taxonomy.clusters[0],id:'new',name:'New build',deckIds:entries.slice(0,3).map(e=>e.deckId)});
 const r=metaFreshness(index,entries,events,taxonomy,scope,'2026-10-30');
 assert.equal(r.returning,0); assert.equal(r.builds[0].previousShare,0); assert.equal(r.builds[0].share,100);
});
