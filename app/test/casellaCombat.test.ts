import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {casellaTurnForecast,simulateCasellaTurns,casellaCombatForecast,sequenceCasellaCombat,type Card} from '@gatcg/shared';
import {withSpoilerCards} from '../src/lib/spoilerCatalog';
import {casellaWind as deck} from './fixtures/casella-wind';
const cards=new Map(withSpoilerCards(JSON.parse(readFileSync(new URL('../../data/card-catalog.json',import.meta.url),'utf8')).cards as Card[]).map(c=>[c.name,c]));
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
 const evidence=JSON.parse(readFileSync(new URL('./fixtures/tcgengine-casella-contracts.json',import.meta.url),'utf8'));
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

const orderedMain=deck.main.flatMap(l=>Array.from({length:l.quantity},()=>l.name));
const rotate=(offset:number)=>[...orderedMain.slice(offset),...orderedMain.slice(0,offset)];
test('turn one has no free level, aria, Charger or first-player draw/attack',()=>{
 const quiet={...deck,material:deck.material.filter(l=>l.name!=='Backup Charger'),song:[]};
 const empty=simulateCasellaTurns(fill(20),quiet,cards);
 assert.ok(empty.every(p=>p.level===0&&p.aria===0&&p.total===0));
 assert.deepEqual(empty.map(p=>p.drawn),[7,8,9,10,11]);
 const opening=['Fluffy Shopkeep',...fill(20)];
 const first=simulateCasellaTurns(opening,quiet,cards,2);
 const second=simulateCasellaTurns(opening,quiet,cards,2,'second');
 assert.equal(first[0].total,0);assert.equal(second[0].total,1);
 assert.equal(second[0].drawn,first[0].drawn+1);
 assert.equal(first[1].level,1);assert.equal(first[1].allies,1);
 assert.equal(first[1].hand,7); // Four memory, one banished BEFORE recollection, then draw.
 assert.equal(first[1].repeat,0); // Waking up is not a same-turn replay.
});
test('Dungeon deployment pays reserve and two memory, and can accelerate turn-one level',()=>{
 const r=simulateCasellaTurns(['Dungeon Guide',...fill(20)],{...deck,song:[]},cards,1)[0];
 assert.equal(r.level,1);assert.equal(r.aria,2);assert.equal(r.memory,1);
 assert.equal(r.hand,3);assert.equal(r.allies,1);assert.equal(r.total,0);
 assert.equal(r.mainAccounted,r.mainSize);
 const evidence=JSON.parse(readFileSync(new URL('./fixtures/tcgengine-casella-contracts.json',import.meta.url),'utf8'));
 const assertions=JSON.parse(evidence.integration.find((s:{path:string})=>s.path.includes('dungeon-guide-enter')&&s.path.endsWith('assertions.json')).excerpt);
 assert.ok(assertions.some((a:{zone:string;value:number})=>a.zone==='myBanish'&&a.value===2));
 assert.ok(evidence.timing.some((s:{excerpt:string})=>s.excerpt.includes('Starting player skips first draw phase')));
});
test('all physical Main cards survive accounting across every acceptance-deck rotation',()=>{
 for(let i=0;i<orderedMain.length;i++) {
  const frames=simulateCasellaTurns(rotate(i),deck,cards);
  for(const [index,p] of frames.entries()) {
   assert.equal(p.mainAccounted,60,`rotation ${i}, turn ${p.turn}`);
   assert.equal(p.total,p.first+p.repeat+p.buffs+p.triggered);
   assert.equal(p.thisTurn,p.total-(frames[index-1]?.total??0));
   assert.ok(p.thisTurn>=0&&p.aria>=0&&p.hand>=0&&p.memory>=0);
   assert.deepEqual(p.trace.slice(0,frames[index-1]?.trace.length??0),frames[index-1]?.trace??[]);
  }
 }
});
test('Floating and Active Memory are spent once; temporary buffs expire, Chromatic persists',()=>{
 const frames=simulateCasellaTurns(rotate(31),deck,cards);
 const fourth=frames[3],fifth=frames[4];
 assert.equal(fourth.trace.filter(t=>t==='Floating Memory · pay 1').length,1);
 assert.equal(fourth.trace.filter(t=>t==='Active Memory · pay 1').length,1);
 assert.equal(fourth.level,3);
 assert.equal(fourth.buffs,4); // One Harness attack, followed by Chromatic's permanent counter.
 assert.equal(fifth.buffs-fourth.buffs,5); // New Harness + persistent counter, not the prior Harness.
 assert.equal(fifth.trace.filter(t=>t==='Sing Chromatic · premiere').length,1);
 assert.equal(fifth.mainAccounted,60);
});
test('turn forecasts use persistent trajectories and match comparison populations',()=>{
 const points=casellaTurnForecast(deck,cards,16);
 assert.deepEqual(points.map(p=>p.turn),[2,3,4,5]);
 assert.ok(points.every(p=>p.available&&p.samples===16&&p.low<=p.median&&p.median<=p.high));
 assert.ok(points.every(p=>p.levelThreeChance>=0&&p.levelThreeChance<=1));
 assert.deepEqual(points,casellaTurnForecast({...deck,main:[...deck.main].reverse().flatMap(l=>Array.from({length:l.quantity},()=>({name:l.name,quantity:1})))},cards,16));
 assert.ok(casellaTurnForecast({...deck,song:[]},cards,1).every(p=>!p.available));
 assert.ok(casellaTurnForecast({...deck,material:deck.material.filter(l=>l.name!=='Spirit of Wind')},cards,1).every(p=>!p.available));
 assert.ok(casellaTurnForecast(deck,new Map(),1).every(p=>!p.available));
});
