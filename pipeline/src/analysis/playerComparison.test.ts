import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePlayerResults, priorEventRating, regionalPercentile, type PlayerComparisonData, type EloHistoryData, type OmnidexIndexData } from '@gatcg/shared';
const history: EloHistoryData = {generatedAt:'2025-03-01',history:{'1':[{eventId:1,date:'2025-01-01',rating:1500},{eventId:2,date:'2025-02-01',rating:1700},{eventId:9,date:'2026-01-01',rating:2000}], '2':[{eventId:1,date:'2025-01-01',rating:1600},{eventId:2,date:'2025-02-01',rating:1800}]}};
const index = {events:[{id:2,date:'2025-02-01',status:'complete',setting:'physical',format:'standard',seasonId:1},{id:3,date:'2025-02-02',status:'complete',setting:'physical',format:'draft',seasonId:1},{id:4,date:'2025-02-03',status:'complete',setting:'online',format:'standard',seasonId:1},{id:9,date:'2026-01-01',status:'complete',setting:'physical',format:'standard',seasonId:2},{id:5,date:'2025-01-01',status:'complete',setting:'physical',format:'standard',seasonId:null}]} as OmnidexIndexData;
const data:PlayerComparisonData = {generatedAt:'2025-03-01',events:[{id:2,matches:[[1,2,1],[1,2,null],[2,1,2],[1,3,1],[1,2,1]]},{id:3,matches:[[1,2,2]]},{id:4,matches:[[1,2,2]]},{id:9,matches:[[1,2,2]]},{id:5,matches:[[1,2,2]]}]};
const region = (id:number) => id===2 ? 'us-west' : null;
test('comparison uses correct orientation, excludes other formats, online and future results, and requires five matches for Elo',()=>{
 const [a,b]=comparePlayerResults(data,index,history,[1,2],'standard',1,'2025-03-01',region);
 assert.deepEqual(a.record,{wins:3,losses:1,ties:1});assert.deepEqual(b.record,{wins:1,losses:2,ties:1});assert.equal(a.rating,1700);assert.equal(b.rating,null);
 assert.deepEqual(a.opponents.find(o=>o.playerId===2)?.record,{wins:2,losses:1,ties:1});
 assert.equal(a.regions.find(r=>r.region==='us-west')?.opponentRating,1600);assert.equal(a.regions.find(r=>r.region==='unassigned')?.opponentRating,null);
 assert.equal(a.matches.filter(m=>m.opponentRating!==null).length,4);
});
test('pre-event ratings exclude same-event and same-time checkpoints, missing stays missing',()=>{
 assert.equal(priorEventRating(history,2,'2025-02-01'),1600);assert.equal(priorEventRating(history,2,'2025-01-01'),null);assert.equal(priorEventRating(history,3,'2025-02-01'),null);
});
test('all time includes unseasoned events once and derives five-match eligibility without averaging ratings',()=>{
 const duplicate={...data,events:[...data.events,data.events[0]]};
 const [a,b]=comparePlayerResults(duplicate,index,history,[1,2],'standard',0,'2025-03-01',region);
 assert.deepEqual(a.record,{wins:3,losses:2,ties:1});assert.equal(b.rating,1800);assert.equal(b.matches.length,5);
});
test('percentiles use midrank for ties and preserve unavailable populations',()=>{
 assert.equal(regionalPercentile(1500,[1400,1500,1500,1600]),50);assert.equal(regionalPercentile(1700,[1400,1500]),100);assert.equal(regionalPercentile(1500,[]),null);assert.equal(regionalPercentile(null,[1500]),null);
});
