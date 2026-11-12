import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRaiDrawPolicy, estimateDrawAndDamageInfluence, compareRaiDrawReports, computeRaiDamageReport, type Card, type InfluenceDrawSource } from '@gatcg/shared';
import { CONDITIONAL_DRAW_CONTRACTS } from '../../shared/src/conditionalDrawPolicy';
import { computeDeckAnalysisReport } from '../src/lib/deckAnalysisReport';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url),'utf8')).cards.map((card: Card) => [card.name,card]));
const source = (overrides: Partial<InfluenceDrawSource>): InfluenceDrawSource => ({ name:'Filler',quantity:30,draws:0,drawSteps:[],reserve:2,discard:0,resolvesTo:'field',...overrides });
const paid = { rai:true as const,lineage:[{name:'One',memory:1},{name:'Two',memory:2},{name:'Three',memory:3}] };
const free = {...paid,lineage:paid.lineage.map(card=>({...card,memory:0}))};
const run = (cards: InfluenceDrawSource[], turns=5, opening=7, policy=free) => estimateDrawAndDamageInfluence(cards,[],opening,'first',turns,1,policy);
const fixture = (element: string) => {
 const data = JSON.parse(readFileSync(new URL(`./fixtures/rai-${element}-conditional-draw.json`,import.meta.url),'utf8'));
 const lines = (section: Record<string,number>) => Object.entries(section).map(([name,quantity])=>({name,quantity}));
 return { main:lines(data.main),material:lines(data.material) };
};

test('all reviewed contracts use catalog costs, zones and element access; no tokens are playable', () => {
 const water = fixture('water');
 for(const [name,contract] of Object.entries(CONDITIONAL_DRAW_CONTRACTS)) {
  const card = catalog.get(name)!;
  assert.ok(card, name); assert.ok(!card.types.includes('TOKEN'),name);
  const spirit = ['FIRE','WIND','WATER'].includes(card.element) ? `Spirit of ${card.element[0]+card.element.slice(1).toLowerCase()}` : 'Spirit of Water';
  const material=water.material.map(line=>line.name.startsWith('Spirit of ')?{...line,name:spirit}:line);
  const policy=createRaiDrawPolicy([{name,quantity:4}],material,catalog)!;
  assert.ok(policy.modeled.has(name),name);
  assert.equal(policy.main[0].reserve,card.cost_reserve,name);
  assert.equal(policy.main[0].conditionalDraw,contract.conditionalDraw,name);
  assert.equal(policy.main[0].resolvesTo,card.types.includes('ACTION')?'graveyard':'field',name);
  if(['FIRE','WIND'].includes(card.element)) assert.equal(createRaiDrawPolicy([{name,quantity:4}],water.material,catalog)!.modeled.has(name),false,name);
 }
 assert.equal(createRaiDrawPolicy([{name:'Relic of Sunken Past',quantity:4}],water.material,catalog)!.main[0].floatingMemory,undefined);
 assert.ok(catalog.get('Relic of Sunken Past')!.classes.includes('TAMER'));
});

test('sacrifice draws pay reserve, consume the permanent once and preserve destinations', () => {
 for(const role of ['sacrifice-hand','sacrifice-memory'] as const) {
  const cards=[source({conditionalDraw:role,reserve:6})];
  const [point]=run(cards,1);
  assert.equal(point.seen,8); assert.equal(point.field,0); assert.equal(point.graveyard,1);
  assert.equal(point.memory,role==='sacrifice-memory'?7:6);
  assert.equal(point.hand,role==='sacrifice-hand'?1:0);
  assert.equal(run(cards.map(c=>({...c,reserve:100})),1)[0].seen,7);
 }
});

test('end-phase enlighten waits for Mage class and cannot fund another main play', () => {
 const cards=[source({conditionalDraw:'end-enlighten',reserve:6})];
 const points=run(cards,3);
 assert.equal(points[0].seen,7);
 assert.equal(points[1].seen,9); // Two entry counters + one end-phase counter.
 assert.equal(points[1].field,2); // The end-phase draw did not purchase a third permanent.
 assert.equal(points[1].hand,1);
 const locked={...paid,lineage:paid.lineage.map(c=>({...c,memory:100}))};
 assert.deepEqual(run(cards,3,7,locked).map(p=>p.seen),[7,8,9]);
});

test('Windrider returns a physical copy before recollection and must pay again', () => {
 const cards=[source({conditionalDraw:'return-enlighten',reserve:6})];
 const points=run(cards,3);
 assert.equal(points[0].seen,7); assert.equal(points[0].field,1);
 assert.equal(points[1].seen,9); assert.equal(points[1].field,1);
 assert.equal(points[1].memory,6); assert.equal(points[1].hand,2);
 for(const point of points) assert.equal(point.hand+point.memory+point.field+point.graveyard+point.banished+point.library,30);
});

test('enlighten replacement stacks per physical Forecaster and Invoker consumes only available counters', () => {
 const withForecasters=run([source({quantity:4,conditionalDraw:'forecaster',reserve:0}),source({quantity:26,conditionalDraw:'enlighten',reserve:2,resolvesTo:'graveyard'})]);
 const without=run([source({quantity:4,reserve:0}),source({quantity:26,conditionalDraw:'enlighten',reserve:2,resolvesTo:'graveyard'})]);
 assert.ok(withForecasters[4].seen>without[4].seen);
 const invokers=run([source({conditionalDraw:'invoker',reserve:6})],2);
 assert.equal(invokers[0].seen,7); assert.equal(invokers[1].seen,9);
 assert.equal(invokers[1].graveyard,0);
});

test('discard-then-draw cannot use its own source, reserved cards, or a non-Spell', () => {
 assert.equal(run([source({conditionalDraw:'discard-draw',reserve:6})],1)[0].seen,7);
 assert.equal(run([source({conditionalDraw:'discard-draw',reserve:5})],1)[0].seen,8);
 assert.equal(run([source({conditionalDraw:'discard-spell',reserve:5})],1)[0].seen,7);
 const [point]=run([source({conditionalDraw:'discard-spell',reserve:5,spell:true,resolvesTo:'graveyard'})],1);
 assert.equal(point.seen,8); assert.equal(point.graveyard,2); assert.equal(point.memory,5);
});

test('influence thresholds count reserved cards and exclude the resolving source', () => {
 const cards=[source({conditionalDraw:'influence-memory',reserve:4,resolvesTo:'graveyard'})];
 assert.equal(run(cards,1,7)[0].seen,7);
 const [point]=run(cards,1,6);
 assert.equal(point.seen,7); assert.equal(point.memory,5);
});

test('Floating Memory draw payments are finite and obey current class/level in every zone', () => {
 const cards=[source({quantity:10,draws:1,drawSteps:[{count:1,destination:'hand'}],reserve:1,resolvesTo:'graveyard',floatingMemory:'mage-level-2'}),source({quantity:20,conditionalDraw:'floating-draw',reserve:1,resolvesTo:'graveyard'})];
 const points=run(cards,5);
 assert.equal(points[0].banished,0); assert.equal(points[1].banished,0);
 assert.ok(points[4].banished>0);
 for(const p of points) assert.equal(p.hand+p.memory+p.graveyard+p.field+p.banished+p.library,30);
 const noFuel=run([source({conditionalDraw:'floating-draw',reserve:0,resolvesTo:'graveyard'})]);
 assert.deepEqual(noFuel.map(p=>p.seen),[7,8,9,10,11]);
 assert.ok(noFuel.every(p=>p.graveyard===0));
});

test('Deluge sacrifices only on a later recollection with three physical Water cards', () => {
 const cards=[source({quantity:8,conditionalDraw:'deluge-draw',reserve:1}),source({quantity:22,draws:1,drawSteps:[{count:1,destination:'hand'}],reserve:1,resolvesTo:'graveyard',waterElement:true})];
 const points=run(cards,3);
 const dry=run(cards.map(c=>({...c,waterElement:false})),3);
 assert.equal(points[0].seen,dry[0].seen);
 assert.equal(points[1].seen,dry[1].seen); // Only two Water cards were present at the first recollection.
 assert.ok(points[2].seen>dry[2].seen);
 assert.ok(points[2].graveyard>dry[2].graveyard);
});

test('Imperial Apprentice consumes a distinct existing graveyard card for each Spell trigger', () => {
 const cards=[source({quantity:8,conditionalDraw:'apprentice',reserve:0}),source({quantity:22,draws:1,drawSteps:[{count:1,destination:'hand'}],reserve:1,resolvesTo:'graveyard',floatingMemory:'always',spell:true})];
 const points=run(cards,1);
 const skills=run(cards.map(c=>({...c,spell:false})),1);
 assert.ok(points[0].seen>skills[0].seen);
 assert.ok(points[0].banished>0); assert.equal(skills[0].banished,0);
 assert.equal(points[0].hand+points[0].memory+points[0].field+points[0].graveyard+points[0].banished+points[0].library,30);
});

for(const element of ['fire','water','wind']) test(`${element} fixture agrees across standalone, comparison, reordered input and source cards`, () => {
 const deck=fixture(element);
 const report=computeDeckAnalysisReport(deck.main,deck.material,catalog);
 const comparison=compareRaiDrawReports(deck,deck,catalog)!;
 assert.equal(report.size,60); assert.equal(comparison.status,'ready');
 if(comparison.status!=='ready') return;
 for(const point of comparison.points) {
  const standalone=report.checkpoints.find(p=>p.order==='first' && p.turn===point.turn)!;
  assert.equal(Math.round(point.after.seen),standalone.adjustedSeen);
  assert.equal(point.after.memory,standalone.memory); assert.equal(point.medianDelta,0);
 }
 assert.deepEqual(compareRaiDrawReports({...deck,main:[...deck.main].reverse()},deck,catalog),comparison);
 for(const source of comparison.sources) assert.ok(report.sources.some(c=>c.name===source.name && c.modeled),source.name);
 const missing=new Map(catalog); missing.delete(deck.main[0].name);
 assert.equal(compareRaiDrawReports(deck,deck,missing)?.status,'missing');
 assert.equal(compareRaiDrawReports(deck,{...deck,material:[]},catalog)?.status,'unsupported');
 const damage=computeRaiDamageReport(deck,catalog);
 assert.equal(damage.status,'ready');
});


test('Wool Brook pays its separate six-card activation once per physical refinement counter', () => {
 const cards=[source({quantity:1,conditionalDraw:'wool-brook',reserve:4,draws:1,drawSteps:[{count:1,destination:'memory'}]}),source({quantity:11})];
 // Drawing the full library leaves no replacement card; never spend an activation pointlessly.
 assert.equal(run(cards,1,12)[0].memory,4);
 const many=[source({quantity:28}),source({quantity:2,conditionalDraw:'wool-brook',reserve:4,draws:1,drawSteps:[{count:1,destination:'memory'}]})];
 const points=run(many,8,12);
 const without=run(many.map(card=>({...card,conditionalDraw:undefined})),8,12);
 assert.ok(points[7].seen>without[7].seen);
 assert.ok(points[7].seen-without[7].seen<=2);
 assert.ok(points.some((point,i)=>point.memory>without[i].memory));
});


test('reviewed catalog contracts cannot silently drift after a catalog refresh', () => {
 const reviewed = JSON.parse(readFileSync(new URL('./fixtures/conditional-draw-contracts.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(reviewed).sort(),Object.keys(CONDITIONAL_DRAW_CONTRACTS).sort());
 for(const [name,expected] of Object.entries(reviewed)) {
  const {effect,cost_reserve,element,types,classes,subtypes,life}=catalog.get(name)!;
  assert.deepEqual({effect,cost_reserve,element,types,classes,subtypes,life},expected,name);
 }
});

test('reviewed level-three draws never use turn number in place of paid progression', () => {
 const deck=fixture('water');
 for(const name of ['Aenean Ward','Rising Tides']) {
  const policy=createRaiDrawPolicy([{name,quantity:30}],deck.material,catalog)!;
  const points=run(policy.main,4,7,free);
  assert.deepEqual(points.slice(0,3).map(p=>p.seen),[7,8,9]);
  assert.ok(points[3].seen>10);
  const locked={...paid,lineage:paid.lineage.map(c=>({...c,memory:100}))};
  assert.deepEqual(run(policy.main,4,7,locked).map(p=>p.seen),[7,8,9,10]);
 }
});

test('changed conditional source copies propagate to paired results and associated cards', () => {
 const before=fixture('wind');
 const after={...before,main:before.main.map(line=>line.name==='Winbless Forecaster'?{...line,name:'Wool Brook'}:line)};
 const comparison=compareRaiDrawReports(before,after,catalog)!;
 assert.equal(comparison.status,'ready');
 if(comparison.status!=='ready') return;
 const report=computeDeckAnalysisReport(after.main,after.material,catalog);
 assert.deepEqual(comparison.sources.find(s=>s.name==='Wool Brook'),{name:'Wool Brook',before:0,after:4});
 assert.deepEqual(comparison.sources.find(s=>s.name==='Winbless Forecaster'),{name:'Winbless Forecaster',before:4,after:0});
 for(const point of comparison.points) {
  assert.equal(point.after.hand,report.checkpoints.find(p=>p.turn===point.turn&&p.order==='first')!.hand);
  assert.equal(point.medianDelta,point.after.seenRange.median-point.before.seenRange.median);
 }
});
