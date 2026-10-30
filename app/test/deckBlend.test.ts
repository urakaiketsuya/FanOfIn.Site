import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shortHash, type Card, type DeckPopularityEntry } from '@gatcg/shared';
import { canonicalSignature } from '../src/features/popular/popularityAggregation';
import { blendDecks, blendWeight, type BlendSource } from '../src/features/compare/deckBlend';
import { blendBuilderPath } from '../src/features/compare/deckBlendHandoff';
import { parseBuilderShareParams } from '../src/features/deckbuilder/persistence/builderPersistence';
const card=(name:string,types=['ACTION'],subtypes:string[]=[])=>({name,types,subtypes,elements:['NORM'],legality:null} as Card);
const cards=new Map(Array.from({length:17},(_,i)=>[`Card ${i}`,card(`Card ${i}`)] as const));
cards.set('Hero',card('Hero',['CHAMPION']));cards.set('Spirit',card('Spirit',['CHAMPION'],['SPIRIT']));
const main=Array.from({length:15},(_,i)=>({card:`Card ${i}`,quantity:4}));
const a:BlendSource={key:'1:1',label:'A',format:'STANDARD',decklist:{main,material:[{card:'Hero',quantity:1},{card:'Spirit',quantity:1}],sideboard:[]}};
const b:BlendSource={...a,key:'1:2',label:'B',decklist:{...a.decklist,main:[...main.slice(0,14),{card:'Card 15',quantity:4}]}};
const result=(key:string,wins:number,losses:number)=>({deckId:key,wins,losses,ties:0} as DeckPopularityEntry);
test('real Slime Sovereign lineage retains advanced Slimes in weighted flexible slots',()=>{
 const real:Card[]=JSON.parse(readFileSync(new URL('../../data/card-catalog.json',import.meta.url),'utf8')).cards;
 const catalog=new Map([...cards,...real.map(c=>[c.name,c] as const)]);
 const material=[{card:'Silvie, Slime Sovereign',quantity:1},{card:'Spirit of Fire',quantity:1}];
 const base:BlendSource={...a,decklist:{main:[...main.slice(0,14),{card:'Storm Slime',quantity:4}],material,sideboard:[]}};
 const donor:BlendSource={...b,decklist:{main:[...main.slice(0,14),{card:'Card 14',quantity:4}],material,sideboard:[]}};
 const blend=blendDecks([base,donor],base.key,'balanced',catalog);
 assert.equal(blend.decklist.main.find(line=>line.card==='Storm Slime')?.quantity,2);
 assert.equal(blend.decklist.main.reduce((n,line)=>n+line.quantity,0),60);
 assert.ok(!blend.reasons.some(reason=>reason.includes('element identity')));
});
test('winning adjusts for sample size and treats missing outcomes neutrally',()=>{
 assert.equal(blendWeight(a,[],'winning'),1);
 assert.ok(blendWeight(a,[result(a.key,10,0)],'winning')>blendWeight(a,[result(a.key,1,0)],'winning'));
 const blend=blendDecks([a,b],a.key,'winning',cards,[result(a.key,0,10),result(b.key,10,0)]);
 assert.equal(blend.decklist.main.reduce((n,l)=>n+l.quantity,0),60);
 assert.equal(blend.decklist.main.find(l=>l.card==='Card 15')?.quantity,3);
 assert.deepEqual(blend.decklist.material,a.decklist.material);
 assert.equal(blend.status,'Legal');
 assert.equal(a.decklist.main.length,15);
});
test('same lists cannot manufacture extra evidence; conflicts excluded',()=>{
 assert.throws(()=>blendDecks([a,{...a,key:'duplicate'}],a.key,'popular',cards),/distinct/);
 const c={...b,key:'conflict',format:'PANTHEON' as const};
 const blend=blendDecks([a,b,c],a.key,'balanced',cards);
 assert.equal(blend.excluded,1);assert.equal(blend.included,2);
});
test('cross-section limits, missing data and banned cards stay visible',()=>{
 const side={...a,decklist:{...a.decklist,sideboard:[{card:'Card 15',quantity:4}]}};
 const blend=blendDecks([side,b],side.key,'winning',cards,[result(b.key,100,0)]);
 assert.ok(blend.decklist.main.concat(blend.decklist.sideboard).filter(l=>l.card==='Card 15').reduce((n,l)=>n+l.quantity,0)<=4);
 assert.throws(()=>blendDecks([a,b],a.key,'popular',new Map()),/known format/);
 const banned=new Map(cards);banned.set('Card 0',{...cards.get('Card 0')!,legality:{STANDARD:{limit:0}}} as Card);
 assert.equal(blendDecks([a,b],a.key,'popular',banned).status,'Illegal');
});
test('editable handoff retains format and section quantities',()=>{
 const blend=blendDecks([a,b],a.key,'balanced',cards);
 const path=blendBuilderPath(blend.decklist,blend.format,cards)!;
 const seed=parseBuilderShareParams(new URL(path,'https://example.test').searchParams)!;
 assert.equal(seed.format,'STANDARD');
 assert.equal(seed.lockedCards!.filter(l=>l.section==='main').reduce((n,l)=>n+l.quantity,0),60);
 assert.equal(seed.spiritName,'Spirit');
});
test('equal evidence blends flexible slots instead of just choosing a source',()=>{
 const blend=blendDecks([a,b],a.key,'balanced',cards);
 assert.equal(blend.decklist.main.find(l=>l.card==='Card 14')?.quantity,2);
 assert.equal(blend.decklist.main.find(l=>l.card==='Card 15')?.quantity,2);
});
test('known package copies stay with the base despite donor performance',()=>{
 const catalog=new Map(cards);
 catalog.set('Turbo Charge',card('Turbo Charge'));catalog.set('Backup Charger',card('Backup Charger',['REGALIA']));
 const base={...a,decklist:{...a.decklist,main:[...main.slice(0,14),{card:'Turbo Charge',quantity:4}],material:[...a.decklist.material,{card:'Backup Charger',quantity:1}]}};
 const donor={...b,decklist:{...b.decklist,material:base.decklist.material}};
 const blend=blendDecks([base,donor],base.key,'winning',catalog,[result(donor.key,100,0)]);
 assert.equal(blend.decklist.main.find(l=>l.card==='Turbo Charge')?.quantity,4);
 assert.deepEqual(blend.decklist.material,base.decklist.material);
});
test('handoff preserves a sideboard Spirit without changing the active Spirit',()=>{
 const catalog=new Map(cards);catalog.set('Other Spirit',card('Other Spirit',['CHAMPION'],['SPIRIT']));
 const list={...a.decklist,sideboard:[{card:'Other Spirit',quantity:1}]};
 const path=blendBuilderPath(list,'PANTHEON',catalog)!;
 const seed=parseBuilderShareParams(new URL(path,'https://example.test').searchParams)!;
 assert.equal(seed.spiritName,'Spirit');assert.equal(seed.format,'PANTHEON');
 assert.deepEqual(seed.lockedCards?.filter(l=>l.section==='sideboard'),[{name:'Other Spirit',quantity:1,section:'sideboard'}]);
 assert.equal(seed.lockedCards?.filter(l=>l.section==='material').length,2);
});
test('popularity uses distinct tournament entries and balanced combines both weights',()=>{
 const hash=shortHash(canonicalSignature(a.decklist.main.map(l=>({name:l.card,quantity:l.quantity})),a.decklist.material.map(l=>({name:l.card,quantity:l.quantity}))));
 const entries=[1,2,3].map(i=>({...result(`event:${i}`,5,5),deckHash:hash}));
 assert.equal(blendWeight(a,[...entries,entries[0]],'popular'),3);
 assert.equal(blendWeight(a,entries,'winning'),1);
 assert.equal(blendWeight(a,entries,'balanced'),3);
});
test('invalid quantities cannot produce a fractional draft',()=>{
 const invalid={...b,decklist:{...b.decklist,main:[{card:'Card 0',quantity:0.5}]}};
 assert.throws(()=>blendDecks([a,invalid],a.key,'balanced',cards),/whole numbers/);
});
