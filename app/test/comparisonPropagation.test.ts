import { reviewWorkspace } from '../src/features/deck-review/reviewWorkspace';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareTonorisDrawReports, compareRaiDrawReports, compareRaiDamageReports, compareDefenseReports, compareRecursionReports, type Card, type OmnidexDecklist } from '@gatcg/shared';
import { reviewSwapPreview } from '../src/features/deckbuilder/model/reviewSwapPreview';
import { applyDeckQuantityChanges, chanceAtLeastOne } from '../src/lib/deckChangePreview';
import { decklistToWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspaceImport';
import { loadActiveDeckWorkspace, saveActiveDeckWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspace';
import { reviewSelections } from '../src/features/deck-review/reviewSelections';
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = new Map<string, Card>(read('../../data/card-catalog.json').cards.map((card: Card) => [card.name, card]));
const named = (list: OmnidexDecklist) => ({main:list.main.map(l=>({name:l.card,quantity:l.quantity})),material:list.material.map(l=>({name:l.card,quantity:l.quantity}))});
for (const file of ['tonoris-water', 'rai-fire-conditional-draw', 'rai-wind-conditional-draw', 'diao-wind-defense']) {
 test(`${file}: review, staged changes and persisted workspace feed identical comparison outcomes`, () => {
  const fixture = read(`./fixtures/${file}.json`);
  const deck = Object.fromEntries(['main','material','sideboard'].map(section=>[section,Object.entries(fixture[section] ?? {}).map(([card,quantity])=>({card,quantity}))])) as unknown as OmnidexDecklist;
  const from = deck.main[0];
  const addition = {cardName: 'Frozen Dismissal', section:'main' as const, quantity:from.quantity};
  const preview = reviewSwapPreview(deck,{cardName:from.card,section:'main'},addition);
  const staged = applyDeckQuantityChanges(deck,[{cardName:from.card,section:'main',delta:-from.quantity},{cardName:addition.cardName,section:'main',delta:addition.quantity - (deck.main.find(l=>l.card===addition.cardName)?.quantity ?? 0)}]);
  assert.deepEqual(preview, staged);
  let stored = '';
  const storage = {getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value;}};
  const workspace = decklistToWorkspace(preview,catalog,'review','STANDARD',null,'Named deck','My Decks','saved:fixture');
  saveActiveDeckWorkspace(storage, workspace);
  const restored = loadActiveDeckWorkspace(storage)!;
  assert.equal(restored.title,'Named deck'); assert.equal(restored.deckIdentity,'saved:fixture');
  for (const compare of [compareTonorisDrawReports,compareRaiDrawReports,compareRaiDamageReports,compareDefenseReports,compareRecursionReports]) {
    assert.deepEqual(compare(named(deck),restored,catalog),compare(named(deck),named(staged),catalog));
  }
 });
}
test('Review preview sets exact quantities and preserves separate Sideboard and Song data', () => {
 const deck: OmnidexDecklist = {main:[{card:'A',quantity:4},{card:'B',quantity:1}],material:[],sideboard:[{card:'A',quantity:2}],song:[{card:'Song',quantity:1}]};
 const original=structuredClone(deck);
 const after=reviewSwapPreview(deck,{cardName:'A',section:'main'},{cardName:'B',quantity:3,section:'main'});
 assert.deepEqual(after.main,[{card:'B',quantity:3}]);assert.deepEqual(after.sideboard,deck.sideboard);assert.deepEqual(after.song,deck.song);assert.deepEqual(deck,original);
 const selections=reviewSelections({...named(deck),sideboard:[{name:'A',quantity:2}],song:[{name:'Song',quantity:1}]});
 assert.equal(selections.cards.get('A'),4);assert.equal(selections.sideboard.get('A'),2);
 assert.equal(chanceAtLeastOne(10,1,10),1);
});

test('Review handoff retains saved identity, format and secondary draft context', () => {
 const previous = {version:1 as const,updatedAt:'old',source:'analysis' as const,title:'My deck',sourceLabel:'My Decks',deckIdentity:'saved:42',format:'PANTHEON' as const,championName:'Rai',spiritName:'Spirit of Fire',main:[],material:[],sideboard:[],song:[],maybeboard:[{name:'Fireball',quantity:1}],printings:{},reportOriginal:'original'};
 const next=reviewWorkspace(previous,{...previous,main:[{name:'Peer into Mana',quantity:1}]});
 assert.equal(next.source,'review'); assert.equal(next.title,previous.title);assert.equal(next.deckIdentity,previous.deckIdentity);assert.equal(next.format,'PANTHEON');assert.deepEqual(next.maybeboard,previous.maybeboard);assert.deepEqual(next.printings,previous.printings);assert.equal(next.reportOriginal,'original');assert.deepEqual(previous.main,[]);
});

test('Rai standalone and paired checkpoints use exactly the same sequence', async () => {
 const { computeRaiDrawReport } = await import('@gatcg/shared');
 const fixture=read('./fixtures/rai-fire-conditional-draw.json');
 const deck={main:Object.entries(fixture.main).map(([name,quantity])=>({name,quantity:quantity as number})),material:Object.entries(fixture.material).map(([name,quantity])=>({name,quantity:quantity as number}))};
 const standalone=computeRaiDrawReport(deck,catalog)!;
 const paired=compareRaiDrawReports(deck,deck,catalog)!;
 assert.equal(standalone.status,'ready');assert.equal(paired.status,'ready');
 if(standalone.status==='ready'&&paired.status==='ready') for(const point of paired.points) { assert.deepEqual(point.before,standalone.points[point.turn-1]);assert.deepEqual(point.after,point.before); }
 const missing=new Map(catalog);missing.delete(deck.main[0].name);
 assert.equal(computeRaiDrawReport(deck,missing)?.status,'missing');
 assert.equal(computeRaiDrawReport({...deck,material:deck.material.slice(0,2)},catalog)?.status,'unsupported');
 assert.equal(computeRaiDrawReport({main:[],material:[]},catalog),null);
});

test('Review → Builder seed keeps exact sections, format, title and saved identity', async () => {
 const { loadBuilderSessionSeed, parseBuilderUrlSeed }=await import('../src/features/deckbuilder/persistence/builderSeed');
 const values=new Map<string,string>();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}} as Storage;
 saveActiveDeckWorkspace(storage,{source:'review',title:'My named build',sourceLabel:'My Decks',deckIdentity:'saved:42',format:'PANTHEON',championName:'Rai',spiritName:'Spirit of Wind',main:[{name:'Veiling Breeze',quantity:1}],material:[{name:'Spirit of Wind',quantity:1}],sideboard:[{name:'Veiling Breeze',quantity:1}],song:[],maybeboard:[{name:'Fireball',quantity:1}]});
 const seed=loadBuilderSessionSeed(storage)!;
 assert.equal(seed.format,'PANTHEON');assert.equal(seed.workspaceContext?.title,'My named build');assert.equal(seed.workspaceContext?.deckIdentity,'saved:42');assert.equal(seed.lockedCards.get('Veiling Breeze'),1);assert.equal(seed.lockedCards.get('sideboard\0Veiling Breeze'),1);assert.equal(seed.maybeboard.get('Fireball'),1);
 assert.equal(parseBuilderUrlSeed(new URLSearchParams()),null);
});

test('Builder refresh preserves matching context but does not borrow another deck identity', async () => {
 const {loadBuilderSessionSeed}=await import('../src/features/deckbuilder/persistence/builderSeed');
 const {saveBuilderSession}=await import('../src/features/deckbuilder/persistence/builderPersistence');
 const values=new Map<string,string>();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}} as Storage;
 const session={selection:{format:'STANDARD' as const,championName:'Rai',spiritName:null,archetypeId:null,populationSource:'balanced' as const,pillarBias:null,championLevelCap:null,collectionMode:'all' as const,lockedCards:[{name:'Fireball',quantity:4,section:'main' as const}],rejectedCards:[],maybeboard:[]},changeLog:[]};
 saveBuilderSession(storage,session);
 const workspace={source:'builder' as const,title:'Named deck',sourceLabel:'My Decks',deckIdentity:'saved:42',format:'STANDARD' as const,championName:'Rai',spiritName:null,main:[{name:'Fireball',quantity:4}],material:[],sideboard:[],maybeboard:[]};
 saveActiveDeckWorkspace(storage,workspace);
 assert.equal(loadBuilderSessionSeed(storage)?.workspaceContext?.deckIdentity,'saved:42');
 saveActiveDeckWorkspace(storage,{...workspace,main:[{name:'Fireball',quantity:3}]});
 assert.equal(loadBuilderSessionSeed(storage)?.workspaceContext,undefined);
});
