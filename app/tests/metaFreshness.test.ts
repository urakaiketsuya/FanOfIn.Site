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

test('seasons use assigned IDs, chronological predecessors and the publication cutoff', async () => {
 const { seasonalMetaFreshness } = await import('@gatcg/shared');
 const {index,entries,taxonomy}=fixture(true);
 const seasons = [
  {id:8,name:'Second',slug:'second',dateStart:'2026-10-01',dateEnd:'2026-12-01'},
  {id:4,name:'First',slug:'first',dateStart:'2026-01-01',dateEnd:'2026-09-30'},
  {id:9,name:'Future',slug:'future',dateStart:'2027-01-01',dateEnd:'2027-04-01'},
 ];
 const assigned=events.map(e=>({...e,seasonId:e.id===1?8:4}));
 const rows=seasonalMetaFreshness(index,entries,assigned,taxonomy,seasons,scope,'2026-10-30');
 assert.deepEqual(rows.map(r=>r.season.id),[8,4]);
 assert.equal(rows[0].previousSeason?.id,4); assert.equal(rows[0].inProgress,true);
 assert.equal(rows[0].report.returning,100); assert.ok(rows[0].report.cardChange!>60);
 assert.equal(rows[1].report.returning,null); assert.equal(rows[1].inProgress,false);
 const unavailable=seasonalMetaFreshness(index,entries,assigned,taxonomy,[...seasons,{id:6,name:'Gap',slug:'gap',dateStart:'2026-09-01',dateEnd:'2026-09-30'}],scope,'2026-10-30');
 assert.equal(unavailable[0].previousSeason?.id,6); assert.equal(unavailable[0].report.returning,null);
 const excluded=seasonalMetaFreshness(index,entries,assigned.map(e=>({...e,status:'pending' as const})),taxonomy,seasons,scope,'2026-10-30');
 assert.equal(excluded[0].report.current.decks,0);
 const champion=seasonalMetaFreshness(index,entries,assigned,taxonomy,seasons,{format:'standard',champion:'Silvie'},'2026-10-30');
 assert.equal(champion[0].report.current.decks,0);
});

test('linked comparison includes disappeared builds and section-specific card changes',()=>{
 const {index,entries,taxonomy}=fixture(true);
 taxonomy.clusters[0].deckIds=entries.slice(3).map(e=>e.deckId);
 taxonomy.clusters.push({...taxonomy.clusters[0],id:'new',name:'New build',deckIds:entries.slice(0,3).map(e=>e.deckId)});
 const r=metaFreshness(index,entries,events,taxonomy,scope,'2026-10-30');
 assert.equal(r.buildChanges.find(b=>b.id==='a')?.change,-100);
 assert.equal(r.buildChanges.find(b=>b.id==='new')?.change,100);
 assert.equal(r.cardChanges.find(s=>s.section==='main')?.rows.find(c=>c.name==='Old')?.change,-100);
 assert.equal(r.cardChanges.find(s=>s.section==='sideboard')?.rows[0].change,100);
 const selected=metaFreshness(index,entries,events,taxonomy,{...scope,buildId:'a'},'2026-10-30');
 assert.deepEqual(selected.cardDecks,{current:0,previous:3});
 assert.equal(selected.cardChanges[0].rows[0].current,null);
 assert.deepEqual(selected.buildChanges,r.buildChanges);
 assert.equal(selected.returning,r.returning);
});
