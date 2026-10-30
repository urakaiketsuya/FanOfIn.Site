import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRegionalStrength, ratingQuantile, type OmnidexEventSummary, type OmnidexIndexData, type OmnidexPlayersData, type EloHistoryData, type StrengthEvent } from '@gatcg/shared';
import { strengthEvidence } from './regionalStrength.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
const event = (id: number, region: string, date: string, extra = {}): OmnidexEventSummary => ({id,name:'Weekly',hostId:id,hostAddress:`Store, ${region} 12345`,hostCountry:'US',setting:'physical',status:'complete',category:'regular',format:'standard',seasonId:1,date,...extra} as OmnidexEventSummary);
const events = [event(1,'NY','2025-01-01'),event(2,'NY','2025-01-02'),event(3,'NY','2025-01-03'),event(4,'CA','2025-01-01'),event(5,'CA','2025-01-02'),event(6,'CA','2025-01-03'),event(7,'TX','2025-01-20',{category:'ascent'}),event(8,'CA','2025-02-01'),event(9,'CA','2025-02-02'),event(10,'CA','2025-02-03')];
const index = {generatedAt:'2025-03-01',events,seasons:[{id:1,name:'First',dateStart:'2025-01-01',dateEnd:'2025-01-31'}]} as OmnidexIndexData;
const players = {generatedAt:'2025-03-01',players:[{id:1,country:'US',eventIds:[1,2,3,7,8,9,10]},{id:2,country:'US',eventIds:[4,5,6,7]},{id:3,country:'US',eventIds:[7]},{id:4,country:'CA',eventIds:[4,5,6,7]}]} as OmnidexPlayersData;
const history: EloHistoryData = {generatedAt:'2025-03-01',history:{'1':[{eventId:7,date:'2025-01-20',rating:1700},{eventId:10,date:'2025-02-03',rating:2100}],'2':[{eventId:7,date:'2025-01-20',rating:1600}]}};
const matches = Array.from({length:10},(_,i)=>({a:1,b:2,winner:i < 6 ? 1 : i < 9 ? 2 : null}));
const evidence: StrengthEvent[] = [{id:7,matches:[...matches,{a:1,b:3,winner:3},{a:2,b:4,winner:2}],finishes:[{playerId:1,topCut:true},{playerId:2,topCut:false},{playerId:3,topCut:true}]}];
test('historical regions and ratings exclude future evidence; pair orientation, draws and coverage are preserved',()=>{
 const report=buildRegionalStrength(index,players,history,evidence,'2025-03-01').seasons.find(s=>s.seasonId===1)!;
 assert.deepEqual(report.pairs,[{a:'us-east',b:'us-west',wins:6,losses:3,draws:1,events:1,players:2}]);
 assert.deepEqual(report.regions[0],{region:'us-east',active:1,ratings:[1700],majorEntries:1,topCuts:1});
 assert.equal(report.unassigned,1); assert.equal(report.coveredMajorEvents,1);
});
test('missing cuts stay unavailable; sparse ratings and unassigned opponents do not become zero ratings',()=>{
 const report=buildRegionalStrength(index,players,history,[{id:7,matches:[matches[0]],finishes:null}],'2025-03-01').seasons.find(s=>s.seasonId===1)!;
 assert.equal(report.coveredMajorEvents,0);assert.equal(report.majorEvents,1);
 assert.deepEqual(report.regions[0].ratings,[]);assert.equal(report.regions[0].majorEntries,0);
});
test('formats do not pool matches and future seasons are excluded',()=>{
 const expanded={...index,events:[...events,event(11,'NY','2025-01-21',{format:'draft'})],seasons:[...index.seasons,{id:2,name:'Future',slug:'future',dateStart:'2026-01-01',dateEnd:'2026-05-01'}]};
 const result=buildRegionalStrength(expanded,players,history,[...evidence,{id:11,matches:[matches[0]],finishes:null}],'2025-03-01');
 assert.equal(result.seasons.filter(s=>s.seasonId!==0).length,2);assert.equal(result.seasons.find(s=>s.format==='draft' && s.seasonId===1)!.pairs[0].wins,1);
});
test('quantiles interpolate and leave empty populations unavailable',()=>{
 assert.equal(ratingQuantile([], .5),null);assert.equal(ratingQuantile([1000,1200,1400,1600],.5),1300);assert.equal(ratingQuantile([1500],.9),1500);
});
const bundle = (): OmnidexEventBundle => ({id:7,event:{status:'complete',format:'standard',players:[1,2,3,4],singleEliminationCutSize:2,stages:[{type:'single-elimination',status:'complete'}]},players:[],teams:{error:'Not a team event.'},standings:{standings:[1,2,3,4].map(id=>({id,finalPlacement:id}))},pairingsByRound:[{pairings:[{id:1,status:'complete',pairing:[{id:1,status:'winner'},{id:2,status:'loser'}]},{id:1,status:'complete',pairing:[{id:1,status:'winner'},{id:2,status:'loser'}]},{id:2,status:'complete',pairing:[{id:1,status:'winner'}]}]}]} as unknown as OmnidexEventBundle);
test('adapter deduplicates matches, omits byes, validates the entire cut field and excludes team events',()=>{
 const b=bundle();assert.equal(strengthEvidence(b)!.matches.length,1);assert.equal(strengthEvidence(b)!.finishes!.filter(f=>f.topCut).length,2);
 if (!('error' in b.standings)) b.standings.standings.pop();assert.equal(strengthEvidence(b)!.finishes,null);
 b.event.format='team';assert.equal(strengthEvidence(b),null);
});

test('table IDs restarting each round do not erase later matches; repeated round payloads deduplicate',()=>{
 const b=bundle();
 const first=b.pairingsByRound[0];
 if ('error' in first) throw new Error('fixture');
 first.round=1;first.stage=1;
 const second={...first,round:2};
 b.pairingsByRound=[first,second,second];
 assert.equal(strengthEvidence(b)!.matches.length,2);
 (first as unknown as {round:unknown}).round={id:1};
 (second as unknown as {round:unknown}).round={id:2};
 assert.equal(strengthEvidence(b)!.matches.length,2);
});

test('all time pools raw history including unseasoned events, counts players once, and uses latest ratings',()=>{
 const expanded={...index,events:[...events,event(11,'NY','2023-01-01',{seasonId:null}),event(11,'NY','2023-01-01',{seasonId:null}),event(12,'NY','2026-01-01')]};
 const stable={...players,players:players.players.map(p=>p.id===1 ? {...p,eventIds:[1,2,3,7]} : p)};
 const records=[{id:7,matches:matches.slice(0,5),finishes:evidence[0].finishes},{id:11,matches:matches.slice(5),finishes:null},{id:12,matches,finishes:null}];
 const data=buildRegionalStrength(expanded,stable,history,records,'2025-03-01');
 const all=data.seasons.find(s=>s.seasonId===0)!;
 assert.equal(data.seasons[0].name,'All time');
 assert.equal(all.events,2);
 assert.deepEqual(all.regions[0],{region:'us-east',active:1,ratings:[2100],majorEntries:1,topCuts:1});
 assert.deepEqual(all.pairs,[{a:'us-east',b:'us-west',wins:6,losses:3,draws:1,events:2,players:2}]);
 assert.deepEqual(data.seasons.find(s=>s.seasonId===1)!.regions[0].ratings,[]);
});
test('all time uses current inferred cohorts rather than summing historical regional memberships',()=>{
 const all=buildRegionalStrength(index,players,history,evidence,'2025-03-01').seasons.find(s=>s.seasonId===0)!;
 // Player 1 has mixed East/West local attendance by March and is no longer assigned East.
 assert.equal(all.regions[0].active,0);assert.equal(all.pairs.length,0);assert.equal(all.unassigned,2);
});
