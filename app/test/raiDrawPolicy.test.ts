import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRaiDrawPolicy, estimateDrawInfluence, type Card, type InfluenceDrawSource } from '@gatcg/shared';
import { computeDeckAnalysisReport } from '../src/lib/deckAnalysisReport';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/rai-fire-draw.json', import.meta.url), 'utf8'));
const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({name, quantity}));
const main = lines(fixture.main), material = lines(fixture.material);
const source = (overrides: Partial<InfluenceDrawSource> = {}): InfluenceDrawSource => ({name:'Draw',quantity:30,draws:1,reserve:2,discard:0,mageAction:true,...overrides});
const policy = { rai: true as const, lineage: [{name:'One',memory:1},{name:'Two',memory:2},{name:'Three',memory:3}] };

test('Rai fixture uses real costs, class bonus and paid draw sources deterministically', () => {
 const configured = createRaiDrawPolicy(main, material, catalog)!;
 assert.ok(configured);
 assert.deepEqual(configured.progression.lineage.map(card=>card.memory),[1,2,3]);
 const report = computeDeckAnalysisReport(main, material, catalog);
 assert.deepEqual(report,computeDeckAnalysisReport(main,material,catalog));
 assert.ok(report.sources.find(card=>card.name==='Indolent Leisure')?.modeled);
 assert.ok(report.checkpoints.every(point=>point.adjustedSeen >= point.seen && point.adjustedSeen <= 60));
 assert.ok(report.checkpoints[2].extra > 0);
});

test('class bonus does not become universal and off-element draw cards cannot activate', () => {
 assert.equal(createRaiDrawPolicy(main,material.filter(line=>line.name!=='Rai, Archmage'),catalog),null);
 const water = material.map(line=>line.name==='Spirit of Fire'?{...line,name:'Spirit of Water'}:line);
 const configured = createRaiDrawPolicy(main,water,catalog)!;
 for (const name of ['Creative Tinder']) {
  assert.equal(configured.main.find(card=>card.name===name)!.draws,0);
  assert.equal(configured.modeled.has(name),false);
 }
 const missing = new Map(catalog); missing.delete('Indolent Leisure');
 assert.equal(createRaiDrawPolicy(main,material,missing),null);
});

test('progression cannot use turn number or hand cards as paid memory', () => {
 const free = [source({reserve:0,drawSteps:[{count:1,destination:'memory'}],mechanic:'indolent-leisure'})];
 const blocked = {...policy,lineage:policy.lineage.map(card=>({...card,memory:100}))};
 const actual = estimateDrawInfluence(free,[],1,'first',5,1,blocked);
 const baseline = estimateDrawInfluence(free.map(card=>({...card,mechanic:undefined})),[],1,'first',5,1);
 assert.deepEqual(actual,baseline);
});

test('paid progression banishes memory and first Mage trigger is once per turn', () => {
 const cards = [source()];
 const points = estimateDrawInfluence(cards,[],7,'first',5,1,policy);
 const noTrigger = estimateDrawInfluence(cards.map(card=>({...card,mageAction:false})),[],7,'first',5,1,policy);
 assert.equal(points[0].seen,noTrigger[0].seen);
 assert.equal(points[1].seen,noTrigger[1].seen);
 assert.ok(points[2].seen > noTrigger[2].seen);
 // One spell played costs one card; payments remove a total of six physical cards.
 assert.ok(points[4].influence < points[4].seen);
 assert.ok(points.every(point=>point.hand>=0 && point.memory>=0));
});

test('catalog contract pins the reviewed conditional draw and enlighten triggers', () => {
 assert.match(catalog.get('Indolent Leisure')!.effect!, /\[Class Bonus\] \[Level 3\+\] Draw a card into your memory/);
 assert.match(catalog.get('Rai, Spellcrafter')!.effect!, /Put two \*\*enlighten\*\* counters/);
 assert.match(catalog.get('Rai, Archmage')!.effect!, /first Mage action card each turn/);
 assert.match(catalog.get('Academy Guide')!.effect!, /cost 1 less to materialize/);
});

test('Indolent bonus waits for level 3 and adds memory, not spendable hand cards', () => {
 const freeLevels = {...policy,lineage:policy.lineage.map(card=>({...card,memory:0}))};
 const main = [source({mageAction:false,mechanic:'indolent-leisure'})];
 const points = estimateDrawInfluence(main,[],7,'first',4,1,freeLevels);
 const baseline = estimateDrawInfluence(main.map(card=>({...card,mechanic:undefined})),[],7,'first',4,1,freeLevels);
 assert.deepEqual(points.slice(0,3),baseline.slice(0,3));
 assert.equal(points[3].seen-baseline[3].seen,4);
 assert.equal(points[3].memory-baseline[3].memory,4);
 assert.equal(points[3].hand,baseline[3].hand);
});

test('Guide discounts only come from paid physical copies and floor memory cost at zero', () => {
 const cards = [source({draws:0,reserve:3,mageAction:false,mechanic:'academy-guide'})];
 const points = estimateDrawInfluence(cards,[],7,'first',5,1,policy);
 // One Guide per turn: 1/2/3 copies cover the next 1/2/3 memory costs.
 // Influence loses only the Guide played, never gains cards from excess discounts.
 assert.ok(points.every((point,i)=>point.influence===point.seen-i-1));
 const unaffordable = estimateDrawInfluence(cards.map(card=>({...card,reserve:100})),[],7,'first',5,1,policy);
 assert.ok(unaffordable.every(point=>point.seen===point.hand && point.memory===0));
});

test('advanced Actions unlock only after the paid level 3 champion', () => {
 const configured = createRaiDrawPolicy(main,material,catalog)!;
 assert.equal(configured.main.find(card=>card.name==='Pyretic Prognosis')!.minimumLevel,3);
 const cards = [source({reserve:0,minimumLevel:3})];
 const freeLevels = {...policy,lineage:policy.lineage.map(card=>({...card,memory:0}))};
 const points = estimateDrawInfluence(cards,[],7,'first',4,1,freeLevels);
 assert.deepEqual(points.slice(0,3).map(point=>point.seen),[7,8,9]);
 assert.equal(points[3].seen,30);
 const blocked = estimateDrawInfluence(cards,[],7,'first',5,1,policy);
 assert.deepEqual(blocked.map(point=>point.seen),[7,8,9,10,11]);
});

test('enlighten generators spend finite counters and Careful Study pays its level discount', () => {
 const configured = createRaiDrawPolicy([{name:'Careful Study',quantity:4},{name:'Peer into Mana',quantity:4}],material,catalog)!;
 assert.equal(configured.main[0].mechanic,'careful-study');
 assert.equal(configured.main[1].mechanic,'peer-into-mana');
 assert.match(catalog.get('Careful Study')!.effect!, /Efficiency/);
 assert.match(catalog.get('Peer into Mana')!.effect!, /2\+\*\*LV enlighten/);
 const freeLevels = {...policy,lineage:policy.lineage.map(card=>({...card,memory:0}))};
 const study = [source({draws:0,reserve:8,mechanic:'careful-study',mageAction:false})];
 const points = estimateDrawInfluence(study,[],7,'first',3,1,freeLevels);
 assert.equal(points[0].seen,7); // Cannot pay 8 with six other cards.
 assert.equal(points[1].seen,10); // Level 1: pay 7; five counters + two from Spellcrafter buy two draws.
 assert.equal(points[1].memory,7);
 assert.ok(points[2].seenRange.low <= points[2].seenRange.median);
 const peer = estimateDrawInfluence([source({draws:0,reserve:4,mechanic:'peer-into-mana',mageAction:false})],[],7,'first',1,1,policy);
 assert.equal(peer[0].seen,7); // Two counters at level zero cannot buy a draw.
 assert.equal(peer[0].memory,4);
});

test('paid recollection sources wait a turn, sacrifice once, and cannot fund earlier materialization', () => {
 for (const mechanic of ['recollection-hand', 'recollection-memory'] as const) {
  const cards = [source({draws:0,reserve:6,mageAction:false,mechanic})];
  const points = estimateDrawInfluence(cards,[],7,'first',4,1,policy);
  assert.deepEqual(points.map(p=>p.seen),[7,9,11,12]);
  assert.deepEqual(points.map(p=>p.memory),[6,6,0,6]);
  assert.deepEqual(points.map(p=>p.hand),[0,0,6,0]);
  const blocked = estimateDrawInfluence(cards.map(c=>({...c,reserve:100})),[],7,'first',4,1,policy);
  assert.deepEqual(blocked.map(p=>p.seen),[7,8,9,10]);
 }
});

test('catalog recollection sources preserve element, timing and non-Action identity', () => {
 const configured = createRaiDrawPolicy([{name:'Epicurean Institute',quantity:4},{name:'Sovereign Sanctuary',quantity:4}],material,catalog)!;
 assert.equal(configured.main[0].mechanic,'recollection-hand');
 assert.equal(configured.main[0].reserve,1);
 assert.equal(configured.main[1].mechanic,'recollection-memory');
 assert.equal(configured.main[1].minimumLevel,3);
 assert.ok(configured.main.every(c=>c.draws===0 && !c.mageAction));
 assert.match(catalog.get('Epicurean Institute')!.effect!, /beginning of your recollection phase, sacrifice CARDNAME and draw a card/);
 assert.match(catalog.get('Sovereign Sanctuary')!.effect!, /sacrifice Sovereign Sanctuary and draw a card into your memory/);
});
