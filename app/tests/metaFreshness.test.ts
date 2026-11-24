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

test('tournament prep uses current-period list share, pooled match results and an in-scope report', () => {
  const { index, entries, taxonomy } = fixture();
  Object.assign(entries[0], { wins: 6, losses: 3, ties: 1, deckHash: 'common' });
  Object.assign(entries[1], { wins: 7, losses: 2, ties: 1, deckHash: 'common' });
  Object.assign(entries[2], { wins: 9, losses: 0, ties: 0, deckHash: 'rare' });
  Object.assign(entries[3], { wins: 70, losses: 0, ties: 0, deckHash: 'previous' });
  taxonomy.clusters[0].deckIds = entries.filter((_, i) => i !== 2).map(entry => entry.deckId);
  taxonomy.clusters.push({ ...taxonomy.clusters[0], id: 'rare', deckIds: [entries[2].deckId] });

  const { tournamentPrep } = metaFreshness(index, [...entries, entries[0]], events, taxonomy, {
    ...scope, tournamentPrep: true,
  }, '2026-10-30');
  assert.deepEqual(tournamentPrep.likelyOpponents.map(build => build.id), ['a', 'rare']);
  assert.deepEqual(tournamentPrep.worthTesting.map(build => build.id), ['a']);
  const [candidate] = tournamentPrep.worthTesting;
  assert.equal(candidate.count, 2);
  assert.equal(candidate.share, 200 / 3);
  assert.equal(candidate.matches, 20);
  assert.equal(candidate.adjustedScore, 19 / 30);
  assert.equal(candidate.deckHash, 'common');
});

test('event tiers pool matches before ranking and leave trends independent', () => {
  const { index, entries, taxonomy } = fixture();
  const scopedEvents = [
    { ...events[0], category: 'regionals' },
    { ...events[1], category: 'regionals' },
    { ...events[0], id: 3, category: 'store-championships' },
  ];
  Object.assign(entries[0], { wins: 7, losses: 2, ties: 1, deckHash: 'regional' });
  Object.assign(entries[1], { wins: 9, losses: 0, ties: 1, deckHash: 'store', eventId: 3, deckId: '3:1' });
  Object.assign(entries[2], { eventId: 3, deckId: '3:2' });
  index.decks[1].deckId = entries[1].deckId;
  index.decks[2].deckId = entries[2].deckId;
  taxonomy.clusters[0].deckIds = [entries[0].deckId, entries[1].deckId];
  Object.assign(entries[3], { wins: 40, losses: 0, ties: 0, deckHash: 'earlier' });
  const report = (...prepEventTiers: string[]) => metaFreshness(index, entries, scopedEvents, taxonomy, {
    ...scope, tournamentPrep: true, prepEventTiers,
  }, '2026-10-30');

  const regional = report('regionals');
  assert.equal(regional.tournamentPrep.events, 1);
  assert.equal(regional.tournamentPrep.decks, 1);
  assert.equal(regional.tournamentPrep.likelyOpponents[0].share, 100);
  assert.equal(regional.tournamentPrep.likelyOpponents[0].deckHash, 'regional');
  assert.deepEqual(regional.tournamentPrep.worthTesting, []);

  const store = report('store-championships').tournamentPrep;
  assert.equal(store.decks, 2);
  assert.equal(store.likelyOpponents[0].share, 50);
  assert.equal(store.likelyOpponents[0].deckHash, 'store');
  assert.deepEqual(store.worthTesting, []);

  const combined = report('regionals', 'store-championships', 'regionals').tournamentPrep;
  assert.equal(combined.events, 2);
  assert.equal(combined.decks, 3);
  assert.equal(combined.likelyOpponents[0].share, 200 / 3);
  assert.equal(combined.worthTesting[0].matches, 20);
  assert.equal(combined.worthTesting[0].adjustedScore, 22 / 30);
  const breakdown = [
    { tier: 'regionals', matches: 10 },
    { tier: 'store-championships', matches: 10 },
  ];
  assert.deepEqual(combined.worthTesting[0].matchesByTier, breakdown);
  assert.deepEqual(report().tournamentPrep.worthTesting[0].matchesByTier, breakdown);
  assert.deepEqual(report('regionals', 'worlds', 'store-championships').tournamentPrep.worthTesting[0].matchesByTier, [
    { tier: 'worlds', matches: 0 },
    ...breakdown,
  ]);
  assert.equal(report().tournamentPrep.likelyOpponents[0].count, 2);
  assert.deepEqual(report('worlds').tournamentPrep, { decks: 0, events: 0, likelyOpponents: [], worthTesting: [] });
  assert.deepEqual(regional.current, report().current);
  assert.deepEqual(regional.cardChanges, report().cardChanges);
});
