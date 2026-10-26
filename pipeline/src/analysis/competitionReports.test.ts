import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeCompetitionReports } from './competitionReports.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { AnalysisContext } from './context.js';
import type { DeckSignature } from './decklists.js';
import type { ArchetypeTaxonomyData, DeckCardIndexData, DeckPopularityEntry } from '@gatcg/shared';
const sig=(player:number,name:string) => ({player, championName:name, mainCards:[{name:'Card',quantity:4}],materialCards:[{name,quantity:1}],unmatchedCardNames:[]}) as unknown as DeckSignature;
const deck=(player:number,name:string,visible=true)=>({player,visible,decklist:{main:[{card:'Card',quantity:4}],material:[{card:name,quantity:1}],sideboard:[]}});
const bundle=(id:number,date:string) => ({id,event:{date,status:'complete',format:'standard',setting:'physical',host:{id:9},players:[1,2],season:{id:1}},players:[{id:1},{id:2}],teams:{error:'Not a team event.'},decklists:[deck(1,'A'),deck(2,'B')],pairingsByRound:[{pairings:[{id:1,status:'complete',pairing:[{id:1,status:'winner'},{id:2,status:'loser'}]}]}],standings:{standings:[]}}) as unknown as OmnidexEventBundle;
test('published reports reconcile periods, player/build records, repeat attendance and historical team lineup', async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'competition-'));
 try {
  const earlier=bundle(1,'2026-06-01'), a=bundle(2,'2026-09-01'), b=bundle(3,'2026-10-01');
  const hidden=bundle(4,'2026-10-02'); if(Array.isArray(hidden.decklists))hidden.decklists[0].visible=false;
  const team=bundle(5,'2026-10-02');team.event.format='team standard';team.teams=[{name:'Team',finalPlacement:null,players:[{id:1,slot:'A'},{id:2,slot:'B'},{id:3,slot:'C'}]}];team.decklists=[deck(1,'A'),deck(2,'B'),deck(3,'B')];
  // Real Omnidex team standings record byes separately: 2W + 1L + 1 bye has 66.667% MW and 9 points.
  team.standings={standings:[{name:'Team',statsWins:2,statsLosses:1,statsTies:0,statsByes:1}]} as OmnidexEventBundle['standings'];
  const ctx={cardIndex:new Map([['A',{name:'A'}],['B',{name:'B'}],['Card',{name:'Card'}]]),getEventSignatures:()=>new Map([[1,sig(1,'A')],[2,sig(2,'B')],[3,sig(3,'B')]])} as unknown as AnalysisContext;
  const entries=[{eventId:2,player:1,deckId:'2:1',championName:'A'},{eventId:3,player:1,deckId:'3:1',championName:'A'}] as DeckPopularityEntry[];
  const index={generatedAt:'',cardNames:['Card','A'],decks:[{deckId:'2:1',main:[[0,4]],material:[[1,1]],sideboard:[]},{deckId:'3:1',main:[[0,3]],material:[[1,1]],sideboard:[]}]} as DeckCardIndexData;
  const taxonomy={clusters:[{id:'build',name:'A build',championName:'A',deckIds:['2:1','3:1']}]} as ArchetypeTaxonomyData;
  await writeCompetitionReports(dir,[earlier,a,a,b,hidden,team],ctx,entries,index,taxonomy);
  const read=async(n:string)=>JSON.parse(await readFile(path.join(dir,`competition-${n}.json`),'utf8'));
  const battle=await read('battle');assert.equal(battle.rows.length,1);assert.deepEqual(battle.rows[0].periods.map((p:{matches:number})=>p.matches),[1,3]);assert.deepEqual(battle.rows[0].periods.map((p:{identified:number})=>p.identified),[1,2]);
  const p=(await read('players')).rows.find((p:{playerId:number})=>p.playerId===1).formats[0];assert.equal(p.record.wins,3);assert.equal(p.builds.find((b:{name:string})=>b.name==='A build').record.wins,2);assert.deepEqual(p.changes,[{name:'Card',section:'main',before:4,after:3}]);
  const place=(await read('places')).rows[0].formats[0];assert.equal(place.entries,6);assert.equal(place.people,2);assert.equal(place.returning,2);assert.equal(place.fieldEvents,2);
  const t=(await read('teams')).rows[0];assert.equal(t.distinct,2);assert.deepEqual(t.record,{wins:2,losses:1,ties:0});
 } finally {await rm(dir,{recursive:true,force:true});}
});
