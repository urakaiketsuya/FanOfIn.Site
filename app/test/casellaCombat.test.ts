import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {casellaCombatForecast,sequenceCasellaCombat,type Card} from '@gatcg/shared';
import {withSpoilerCards} from '../src/lib/spoilerCatalog';
import {casellaWind as deck} from './fixtures/casella-wind';
const cards=new Map(withSpoilerCards(JSON.parse(readFileSync('data/card-catalog.json','utf8')).cards as Card[]).map(c=>[c.name,c]));
const fill=(n:number)=>Array.from({length:n},()=> 'Nascent Barrier');
test('paid bounce lines attack again without retaining a temporary buff',()=>{
 const r=sequenceCasellaCombat(['Dungeon Guide','Harness Lightning','Reclaim',...fill(14)],[],{...deck,song:[]},cards,32);
 assert.ok(r.repeat>0,JSON.stringify(r));assert.equal(r.buffs,4);assert.ok(r.total>=6);
 assert.equal(sequenceCasellaCombat(['Dungeon Guide','Reclaim'],[],{...deck,song:[]},cards).total,0);
});
test('songs use aria, premiere once and Final Refrain counts removal events',()=>{
 const r=sequenceCasellaCombat(['Final Refrain',"Casella's Poise",...fill(10)],[],{...deck,song:[{name:'Skyward Requiem',quantity:1}]},cards,24);
 assert.ok(r.triggered>0,JSON.stringify(r));assert.ok(r.trace.some(t=>t.includes('premiere')));
 assert.equal(r.trace.filter(t=>t.includes('premiere')).length,1);
});
test('acceptance deck is deterministic, ordered quantiles, and Song omission unavailable',()=>{
 const r=casellaCombatForecast(deck,cards,15,8);
 assert.ok(r.available,JSON.stringify(r.missing));assert.equal(r.samples,8);
 assert.ok(r.low<=r.median&&r.median<=r.high);assert.deepEqual(r,casellaCombatForecast(deck,cards,15,8));
 assert.equal(casellaCombatForecast({...deck,song:[]},cards,15,1).available,false);
 assert.equal(casellaCombatForecast(deck,new Map(),15,1).available,false);
 assert.equal(casellaCombatForecast(deck,cards,0,1).high,0);
});
test('imported existing fixtures cover bounce, modal buff and suppression boundaries',()=>{
 const evidence=JSON.parse(readFileSync('app/test/fixtures/tcgengine-casella-contracts.json','utf8'));
 assert.ok(evidence.scenarios.some((s:{id:string;excerpt:string})=>s.id==='reclaim-return-ally'&&s.excerpt.includes('myHand')));
 assert.ok(evidence.scenarios.some((s:{id:string;excerpt:string})=>s.id==='harness-lightning-buffs-ally-and-self-banishes'&&s.excerpt.includes("5, 'Dungeon Guide gets four additional power'")));
 const r=sequenceCasellaCombat(["Aella, Zephyr's Hand",...fill(6)],[],{...deck,song:[]},cards);
 assert.equal(r.repeat,0); // Suppression is not an immediate extra attack.
});

test('two physical copies are first attacks; memory return is not a replay',()=>{
 const two=sequenceCasellaCombat(['Dungeon Guide','Dungeon Guide',...fill(6)],[],{...deck,song:[]},cards,24);
 assert.equal(two.first,2);assert.equal(two.repeat,0);
 const linked=sequenceCasellaCombat(['Dungeon Guide','StrideTech W',...fill(6)],[],{...deck,song:[]},cards,24);
 assert.equal(linked.repeat,0);
 const turbo=sequenceCasellaCombat(['Turbo Charge'],['Dungeon Guide','Harness Lightning'],{...deck,song:[]},cards,24);
 assert.equal(turbo.total,0); // Charger is not a free Powercell.
});
test('main order and duplicate line splitting do not change sample populations',()=>{
 const original=casellaCombatForecast(deck,cards,10,4);
 const reordered={...deck,main:[...deck.main].reverse().flatMap(l=>Array.from({length:l.quantity},()=>({name:l.name,quantity:1})))};
 assert.deepEqual(casellaCombatForecast(reordered,cards,10,4),original);
 assert.equal(casellaCombatForecast({...deck,song:[deck.song[0],deck.song[0]]},cards,10,1).available,false);
});
