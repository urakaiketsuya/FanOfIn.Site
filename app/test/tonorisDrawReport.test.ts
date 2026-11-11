import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeTonorisDrawReport, type Card } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync('data/card-catalog.json', 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync('app/test/fixtures/tonoris-water.json', 'utf8'));
const lines = (counts: Record<string, number>) => Object.entries(counts).map(([name, quantity]) => ({ name, quantity }));
const material = lines(fixture.material);
const run = (counts: Record<string, number>, samples = 32) => computeTonorisDrawReport({ main: lines(counts), material }, catalog, samples)!;
test('complete Tonoris fixture is deterministic and order independent', () => {
 const report = run(fixture.main);
 assert.deepEqual(report, run(fixture.main));
 const reordered = computeTonorisDrawReport({main:lines(fixture.main).reverse(),material},catalog,32)!;
 assert.deepEqual(report.points.map(p=>p.seen),reordered.points.map(p=>p.seen));
 assert.equal(report.sources.length,5);
 assert.equal(report.points[0].level3,0);
 assert.equal(report.points[2].level3,0);
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
