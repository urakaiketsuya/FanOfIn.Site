import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeTonorisDrawReport, compareTonorisDrawReports, type Card } from '@gatcg/shared';
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
 assert.equal(report.points[3].tokenPaid.median,2); // Fabrication rests itself and spends the two Drones
 assert.equal(report.points[3].fabricated.median,1);
 assert.equal(report.points[3].plays.find(p=>p.name==='Neos Sight')!.probability,0);
 assert.equal(report.points[4].tokenPaid.median,6); // refreshed tokens pay four more for Neos
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
 assert.equal(report.points[2].plays.find(p=>p.name==='Neos Sight')!.probability,0); // upkeep consumes both domains
 assert.equal(report.points[3].plays.find(p=>p.name==='Neos Sight')!.probability,1); // Genesis adds a third reservable domain
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

test('Fabrication cannot rest itself twice and adds only paid, buffed Drones', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const blocked = computeTonorisDrawReport({main:lines({'Engulf':3}),material},controlled,1)!;
 assert.equal(blocked.points[3].fabricated.median,0); // one domain: activation costs five
 assert.equal(blocked.points[4].fabricated.median,0); // two domains: still costs four
 const paid = computeTonorisDrawReport({main:lines({'Engulf':5}),material},controlled,1)!;
 assert.equal(paid.points[3].fabricated.median,1);
 assert.equal(paid.points[4].fabricated.median,2);
 assert.equal(paid.points[4].tokenBuffs.median,2);
 assert.equal(paid.points[4].seen.median,5); // no manufactured draws from token creation
});
test('Fabrication contract uses domain discount and a rest activation', () => {
 assert.match(catalog.get('Obelisk of Fabrication')!.effect!,/\(6\), \[REST\]/);
 assert.match(catalog.get('Obelisk of Fabrication')!.effect!,/for each domain you control/);
 assert.match(catalog.get('Obelisk of Fabrication')!.effect!,/with a \*\*buff\*\* counter/);
});

test('sequence comparisons match standalone results and preserve unavailable states', () => {
 const deck = {main:lines(fixture.main),material};
 const same = compareTonorisDrawReports(deck,deck,catalog,32)!;
 assert.equal(same.status,'ready');
 assert.ok(same.points.every(p=>p.medianSeenDelta===0 && p.level3Delta===0 && p.bonusDelta===0));
 const target = {...deck,main:deck.main.filter(line=>line.name!=='Dungeon Guide')};
 const compared = compareTonorisDrawReports(deck,target,catalog,32)!;
 assert.deepEqual(compared.points[1].after,computeTonorisDrawReport(target,catalog,32)!.points[4]);
 assert.equal(compared.sources.find(source=>source.name==='Dungeon Guide')!.after,0);
 assert.equal(compared.sources.find(source=>source.name==='Dungeon Guide')!.afterPlayed,0);
 assert.equal(compareTonorisDrawReports(deck,{main:[],material:[]},catalog)!.status,'unsupported');
 assert.equal(compareTonorisDrawReports(deck,{...deck,main:lines({'Missing':1})},catalog)!.status,'missing');
 assert.equal(compareTonorisDrawReports({main:[],material:[]},{main:[],material:[]},catalog),null);
});

test('Armaments pays after Fabrication and cannot borrow the token it creates', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const forecast = (quantity: number) => computeTonorisDrawReport({main:lines({'Engulf':quantity}),material},controlled,1)!.points;
 assert.equal(forecast(5)[4].weapons.median,0); // Fabrication leaves one; Armaments needs three
 const paid = forecast(7);
 assert.equal(paid[3].weapons.median,0); // Armaments not created yet
 assert.equal(paid[4].fabricated.median,2);
 assert.equal(paid[4].weapons.median,1); // four + three Reserve, separate REST costs
 assert.equal(paid[4].tokenBuffs.median,2); // weapons are not token allies
 assert.equal(paid[4].seen.median,7);
});
test('Protection reports affordable remaining capacity rather than damage prevented', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const report = computeTonorisDrawReport({main:lines({'Dungeon Guide':1,'Engulf':6}),material},controlled,1)!;
 assert.ok(report.points.slice(0,4).every(point=>point.preventionReady===0));
 assert.equal(report.points[4].preventionReady,1);
 assert.deepEqual(report.points[4].prevention,{low:2,median:2,high:2});
 assert.equal(report.points[4].fabricated.median,2);
 assert.equal(report.points[4].weapons.median,0); // prevention needs one, Armaments needs two
});
test('reviewed remaining Obelisk and Altar contracts match the catalog', () => {
 assert.match(catalog.get('Obelisk of Armaments')!.effect!,/\(5\), \[REST\]/);
 assert.match(catalog.get('Obelisk of Armaments')!.effect!,/Aurousteel Greatsword token/);
 assert.ok(catalog.get('Aurousteel Greatsword')!.types.includes('WEAPON'));
 assert.ok(!catalog.get('Aurousteel Greatsword')!.types.includes('ALLY'));
 assert.match(catalog.get('Obelisk of Protection')!.effect!,/\(4\), \[REST\]/);
 assert.match(catalog.get('Obelisk of Protection')!.effect!,/Prevent the next 2 damage/);
 for (const name of ['Obelisk of Armaments','Obelisk of Protection']) assert.match(catalog.get(name)!.effect!,/for each domain you control/);
 assert.match(catalog.get('Dormant Sacrificial Altar')!.effect!,/Sacrifice an Automaton ally and a Human ally/);
 assert.match(catalog.get('Dormant Sacrificial Altar')!.effect!,/top two cards of your deck into your graveyard/);
});

test('token readiness spends the same physical objects as payments and retains individual buffs', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 controlled.set('Cordelia, Aurous Kaiser',{...catalog.get('Cordelia, Aurous Kaiser')!,cost_reserve:0});
 controlled.set('Automata Genesis',{...catalog.get('Automata Genesis')!,cost_reserve:3});
 controlled.set('Neos Sight',{...catalog.get('Neos Sight')!,cost_reserve:3});
 const deck = {main:lines({'Cordelia, Aurous Kaiser':1,'Automata Genesis':1,'Neos Sight':1}),material};
 const points = computeTonorisDrawReport(deck,controlled,1)!.points;
 assert.equal(points[2].tokenPower.high,0); // Still no paid NEOS access.
 assert.equal(points[3].tokenPower.median,41); // Two 1+6 Drones and three 3+6 Titans.
 assert.equal(points[3].readyTokenPower.median,0); // All five paid costs; Vigor waits for end step.
 assert.ok(points[4].readyTokenPower.median > 0); // Next wake-up restores readiness.
 for (const point of points) assert.ok(point.readyTokenPower.high <= point.tokenPower.high);
 const comparison = compareTonorisDrawReports(deck,deck,controlled,1)!;
 assert.deepEqual(comparison.points[1].after.readyTokenPower,points[4].readyTokenPower);
});

test('newly fabricated Drones can attack and weapons never count as token ally power', () => {
 const controlled = new Map(catalog);
 for (const line of material) controlled.set(line.name,{...catalog.get(line.name)!,cost_memory:0});
 const points = computeTonorisDrawReport({main:lines({'Engulf':7}),material},controlled,1)!.points;
 assert.equal(points[3].readyTokenPower.median,2); // One new Drone with one buff.
 assert.equal(points[4].readyTokenPower.median,4); // Two Drones, one weapon excluded.
 assert.equal(points[4].weapons.median,1);
 assert.equal(points[4].tokenPower.median,4);
});

test('generated token stats are required and pinned to the catalog', () => {
 assert.equal(catalog.get('Automaton Drone')!.power,1);
 assert.equal(catalog.get('Titan Mk II')!.power,3);
 assert.match(catalog.get('Titan Mk II')!.effect!,/Vigor/);
 const missing = new Map(catalog); missing.delete('Titan Mk II');
 const deck = {main:lines(fixture.main),material};
 assert.ok(computeTonorisDrawReport(deck,missing,1)!.missing.includes('Titan Mk II'));
 assert.equal(compareTonorisDrawReports(deck,deck,missing,1)!.status,'missing');
});
