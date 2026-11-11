import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeTonorisDrawReport, type Card } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/tonoris-water.json', import.meta.url), 'utf8'));
const lines = (counts: Record<string, number>) => Object.entries(counts).map(([name, quantity]) => ({ name, quantity }));
const material = lines(fixture.material);
const run = (counts: Record<string, number>, samples = 32) => computeTonorisDrawReport({ main: lines(counts), material }, catalog, samples)!;
test('complete Tonoris fixture is deterministic and order independent', () => {
 const report = run(fixture.main);
 assert.deepEqual(report, run(fixture.main));
 const reordered = computeTonorisDrawReport({main:lines(fixture.main).reverse(),material},catalog,32)!;
 assert.deepEqual(report.points.map(p=>p.seen),reordered.points.map(p=>p.seen));
 assert.equal(report.sources.length,9);
 assert.equal(report.points[0].level3,0);
 assert.ok(report.points[2].level3 > 0);
 assert.ok(report.points[4].seen.median > report.points[4].natural);
 for (const p of report.points) { assert.ok(p.seen.low <= p.seen.median && p.seen.median <= p.seen.high); assert.ok(p.seen.high <= 60); }
});
test('reserve payments are shared; entry draws to memory cannot chain immediately', () => {
 const p = run({'Hub of Innovation':60},1).points[0];
 assert.deepEqual(p.seen,{low:8,median:8,high:8}); // one source + 3 payment leaves 3 hand: cannot pay again
 assert.equal(p.plays[0].probability,1);
});
test('Institute waits until recollection and never creates a destruction token', () => {
 const report = run({'Epicurean Institute':60},1);
 assert.equal(report.points[0].seen.median,7);
 assert.equal(report.points[1].seen.median,11); // three sacrifices + natural draw
 assert.equal(report.points[4].bonus,0);
});
test('Neos requires paid level progression; seeing it is not casting it', () => {
 const report = run({'Neos Sight':60},1);
 assert.equal(report.points[4].seen.median,11);
 assert.equal(report.points[4].plays[0].probability,0);
 assert.equal(report.points[4].level3,0); // no memory generated to pay level 1
});
test('Guide discount pays champion costs without inventing memory', () => {
 const report = run({'Academy Guide':60},1);
 assert.equal(report.points[0].saved.median,0);
 assert.equal(report.points[3].level3,1);
 assert.ok(report.points[3].saved.median > 0);
});
test('unsupported identity, missing data, empty and small libraries', () => {
 assert.equal(computeTonorisDrawReport({main:[],material:[]},catalog),null);
 assert.equal(run({'Missing':1}).missing[0],'Missing');
 assert.ok(run({}).points.every(p=>p.seen.high===0));
 assert.ok(run({'Hub of Innovation':2}).points.every(p=>p.seen.high===2));
});
test('reviewed catalog contract preserves costs and draw destinations', () => {
 assert.match(catalog.get('Neos Sight')!.effect!, /eight or more objects/);
 assert.match(catalog.get('Epicurean Institute')!.effect!, /recollection phase, sacrifice/);
 for(const name of ['Hub of Innovation','Dormant Sacrificial Altar']) assert.match(catalog.get(name)!.effect!, /On Enter:\*\* Draw a card into your memory/);
 assert.deepEqual(['Academy Guide','Epicurean Institute','Dormant Sacrificial Altar','Hub of Innovation','Neos Sight'].map(n=>catalog.get(n)!.cost_reserve),[3,1,2,3,0]);
});
test('actual fixture reaches conditional Neos draws without treating every seen copy as playable', () => {
 const point = run(fixture.main,1024).points[4];
 const neos = point.plays.find(p=>p.name==='Neos Sight')!;
 assert.ok(point.bonus > 0 && point.bonus < neos.probability);
 assert.ok(neos.probability <= point.level3);
 assert.ok(point.saved.high <= 6); // printed 1+2+3, never negative costs
});
test('duplicates merge and Sideboard cannot alter the model', () => {
 const deck = {main:lines(fixture.main),material,sideboard:[{name:'Neos Sight',quantity:100}]};
 const original = computeTonorisDrawReport(deck,catalog,32)!;
 const split = {...deck,main:deck.main.flatMap(line=>Array.from({length:line.quantity},()=>({...line,quantity:1})))};
 assert.deepEqual(original,computeTonorisDrawReport(split,catalog,32));
});

test('Dungeon Guide accelerates through a real two-card memory banish', () => {
 const report = run({'Dungeon Guide':60},1);
 assert.equal(report.points[0].level3,0);
 assert.equal(report.points[1].level3,0); // only one memory card remains: natural level 2 is unaffordable
 assert.equal(report.points[3].level3,1); // later Guides advance only when their payment is possible
 const expensive = new Map(catalog);
 expensive.set('Dungeon Guide', {...catalog.get('Dungeon Guide')!, cost_reserve:1});
 const blocked = computeTonorisDrawReport({main:lines({'Dungeon Guide':1}),material},expensive,1)!;
 assert.equal(blocked.points[4].level3,0);
 assert.equal(report.points[4].saved.high,0); // Guide's effect is not an Academy discount
});
test('Cordelia token payments are consumed and refresh on later turns', () => {
 // Controlled opening: one of each card is always in the seven-card hand.
 const controlled = new Map(catalog);
 for (const name of ['Academy Guide','Dungeon Guide','Cordelia, Aurous Kaiser','Epicurean Institute','Hub of Innovation','Dormant Sacrificial Altar'])
   controlled.set(name,{...catalog.get(name)!,cost_reserve:0});
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const deck = {main:lines({'Academy Guide':1,'Dungeon Guide':1,'Cordelia, Aurous Kaiser':1,'Epicurean Institute':1,'Hub of Innovation':1,'Dormant Sacrificial Altar':1,'Neos Sight':1}),material};
 controlled.set('Neos Sight',{...catalog.get('Neos Sight')!,cost_reserve:4});
 const report = computeTonorisDrawReport(deck,controlled,1)!;
 assert.equal(report.points[2].tokenPaid.high,0); // no Cordelia before NEOS access
 assert.equal(report.points[3].tokenPaid.median,0); // 1 Obelisk + 2 drones cannot pay 4
 assert.equal(report.points[4].tokenPaid.median,4); // second Obelisk makes payment possible
 assert.equal(report.points[4].plays.find(p=>p.name==='Neos Sight')!.probability,1);
});
test('reviewed acceleration and token contracts match catalog text', () => {
 assert.match(catalog.get('Dungeon Guide')!.effect!,/banish two cards at random from your memory/);
 assert.match(catalog.get('Cordelia, Aurous Kaiser')!.effect!,/two Automaton Drone tokens/);
 assert.match(catalog.get('Cordelia, Aurous Kaiser')!.effect!,/Token objects you control have/);
});

test('Kingdom upkeep cannot use unrecollected memory and sacrifices when unpaid', () => {
 const controlled = new Map(catalog);
 // Delay Guardian access: Kingdom cannot grant reservable to a Spirit.
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:99});
 const report = computeTonorisDrawReport({main:lines({'The Eternal Kingdom':1,'Engulf':4}),material},controlled,1)!;
 assert.equal(report.points[0].plays[0].probability,1);
 assert.equal(report.points[1].upkeepPaid.median,0);
 assert.equal(report.points[1].upkeepLost.median,1);
 assert.equal(report.points[4].domainPaid.high,0);
});
test('Kingdom domains refresh, pay upkeep, and cannot repay another cost that turn', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 for (const name of ['Hub of Innovation','The Eternal Kingdom']) controlled.set(name,{...catalog.get(name)!,cost_reserve:0});
 controlled.set('Neos Sight',{...catalog.get('Neos Sight')!,cost_reserve:1});
 const report = computeTonorisDrawReport({main:lines({'Hub of Innovation':1,'The Eternal Kingdom':1,'Neos Sight':1}),material},controlled,1)!;
 assert.equal(report.points[0].domainPaid.median,0); // Spirit has no Guardian class
 assert.equal(report.points[1].domainPaid.median,2);
 assert.equal(report.points[2].domainPaid.median,4);
 assert.equal(report.points[4].upkeepPaid.median,8);
 assert.equal(report.points[4].upkeepLost.high,0);
 assert.equal(report.points[4].plays.find(p=>p.name==='Neos Sight')!.probability,0); // upkeep consumes both domains
});
test('Kingdom contract includes domains, unique retention, and Reserve upkeep', () => {
 const kingdom = catalog.get('The Eternal Kingdom')!;
 assert.ok(kingdom.types.includes('UNIQUE') && kingdom.types.includes('DOMAIN'));
 assert.match(kingdom.effect!,/Domains you control have/);
 assert.match(kingdom.effect!,/beginning of your recollection phase, you may pay \(2\)/);
 assert.match(kingdom.effect!,/If you don't, sacrifice/);
});


test('Automata Genesis cannot finance its own cost or bypass NEOS access', () => {
 const report = run({'Automata Genesis':4,'Engulf':56});
 assert.ok(report.points.every(p=>p.titans.high===0 && p.tokenBuffs.high===0));
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const blocked = computeTonorisDrawReport({main:lines({'Automata Genesis':1,'Engulf':6}),material},controlled,1)!;
 assert.equal(blocked.points[4].level3,1);
 assert.equal(blocked.points[4].titans.high,0); // six payment cards cannot pay twelve
});
test('paid Genesis creates tokens, applies counters, and enables later token payments', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 controlled.set('Cordelia, Aurous Kaiser',{...catalog.get('Cordelia, Aurous Kaiser')!,cost_reserve:0});
 controlled.set('Automata Genesis',{...catalog.get('Automata Genesis')!,cost_reserve:3});
 controlled.set('Neos Sight',{...catalog.get('Neos Sight')!,cost_reserve:3});
 const report = computeTonorisDrawReport({main:lines({'Cordelia, Aurous Kaiser':1,'Automata Genesis':1,'Neos Sight':1}),material},controlled,1)!;
 assert.equal(report.points[2].titans.high,0);
 const p = report.points[3];
 assert.equal(p.titans.median,3);
 assert.equal(p.tokenBuffs.median,30); // six tokens; five token allies
 assert.equal(p.tokenPaid.median,6); // original three pay Genesis; Titans pay Neos
 assert.equal(p.plays.find(p=>p.name==='Neos Sight')!.probability,1);
 assert.equal(report.points[4].titans.median,3); // action itself is not a permanent
});
test('Genesis catalog contract summons three Titans and buffs only token allies', () => {
 const card = catalog.get('Automata Genesis')!;
 assert.equal(card.cost_reserve,12);
 assert.equal(card.element,'NEOS');
 assert.ok(card.types.includes('ACTION'));
 assert.match(card.effect!,/three Titan Mk II tokens/);
 assert.match(card.effect!,/each token ally you control/);
 assert.match(card.effect!,/amount of tokens you control/);
 assert.ok(catalog.get('Titan Mk II')!.types.includes('ALLY'));
});
