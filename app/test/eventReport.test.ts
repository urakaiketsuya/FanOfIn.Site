import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeEventReport, type OmnidexEvent, type OmnidexPlayer, type OmnidexDecklistEntry } from '@gatcg/shared';
const event = { players: [1,2,3,4], status: 'complete', format: 'standard', singleEliminationCutSize: 2, stages: [{type:'swiss'}, {type:'single-elimination'}] } as OmnidexEvent;
const players = [1,2,3,4].map(id => ({ id, finalPlacement:id })) as OmnidexPlayer[];
const decks = [1,2,3,4].map(id => ({ player:id, visible:true, decklist:{ main:[{card:'Shared',quantity:4},...(id===1 ? [{card:'Choice',quantity:2},{card:'Choice',quantity:1}] : [])], material:[{card:'Champion',quantity:1},{card:'Shared',quantity:1}],sideboard:[{card:'Side only',quantity:4}] } })) as OmnidexDecklistEntry[];
const champions = new Map([1,2,3,4].map(id => [id,{name:id===2?'B':'A',cardName:'Champion'}]));
test('advancement uses champion entrants; inclusion counts lists, not copies or sections',()=>{
 const r=computeEventReport(event,players,decks,champions);assert.equal(r.status,null);assert.equal(r.average,50);
 const a=r.champions.find(c=>c.name==='A')!;assert.ok(Math.abs(a.rate-100/3)<1e-10);assert.equal(a.cards.find(c=>c.name==='Choice')!.topRate,100);assert.ok(Math.abs(a.cards.find(c=>c.name==='Choice')!.fieldRate-100/3)<1e-10);
 assert.equal(a.cards.find(c=>c.name==='Shared')!.field,3);assert.ok(!a.cards.some(c=>c.name==='Side only'));
});
test('partial or conflicting field cannot masquerade as full conversion rates',()=>{
 for(const ds of [undefined,decks.slice(1),[...decks,decks[0]],[{...decks[0],visible:false},...decks.slice(1)]]) assert.ok(computeEventReport(event,players,ds,champions).status);
 assert.ok(computeEventReport(event,players,decks,new Map()).status);
});
test('unsupported, ongoing and unverified bracket outcomes remain unavailable',()=>{
 assert.ok(computeEventReport(event,players,decks,champions,true).status);
 for(const e of [{...event,status:'active'},{...event,singleEliminationCutSize:0},{...event,stages:[{id:1,status:'complete',type:'single-elimination'}]},{...event,players:[1,2,3,4,5]}]) assert.ok(computeEventReport(e,players,decks,champions).status);
 assert.ok(computeEventReport(event,[...players.slice(0,3),{...players[3],finalPlacement:null}],decks,champions).status);
 assert.ok(computeEventReport(event,players.map(p=>({...p,finalPlacement:1})),decks,champions).status);
});
test('published event 52397 reconciles to its recorded Top 4 and 16 entrants',()=>{
 const b=JSON.parse(readFileSync(new URL('../../data/omnidex/events/52397.json',import.meta.url),'utf8'));
 const names=new Map<number,{name:string;cardName:string}>(b.decklists.map((d:OmnidexDecklistEntry)=>[d.player,{name:'Test cohort',cardName:'Champion'}]));
 const r=computeEventReport(b.event,b.players,b.decklists,names);assert.equal(r.status,null);assert.equal(r.entrants,16);assert.equal(r.cut,4);assert.equal(r.average,25);assert.equal(r.champions[0].advanced,4);
});
