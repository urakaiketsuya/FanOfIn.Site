import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { actualDrawCheckpoints, calculateCardScenarios, computeCombatAccessForecast, defaultCardScenario, effectAccessReport, fixturePairAccess, type Card } from '@gatcg/shared';
import { computeAggressionForecast } from '../src/lib/aggressionForecast';
const cards = new Map<string,Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json',import.meta.url),'utf8')).cards.map((card:Card)=>[card.name,card]));

test('automatic reports use the listed library for short, regulation-size and oversized lists', () => {
 for (const size of [16,60,80]) {
  const main = [{name:'Ordinary Bear',quantity:4},{name:'Creative Tinder',quantity:size-4}];
  const deck = {main,material:[{name:'Silvie, With the Pack',quantity:1}]};
  const expected = 1-Array.from({length:7},(_,i)=>(size-4-i)/(size-i)).reduce((a,b)=>a*b,1);
  const scenarios = calculateCardScenarios(deck,cards,{...defaultCardScenario(),classes:['TAMER'],seen:7});
  assert.ok(Math.abs(scenarios.find(row=>row.id==='floating')!.access!-expected)<1e-12);
  const effects = effectAccessReport(deck,cards);
  assert.equal(effects.size,size);
  assert.ok(Math.abs(effects.rows.find(row=>row.id==='resources')!.points[0].access-expected)<1e-12);
  assert.equal(computeAggressionForecast(main,cards).deckSize,size);
  assert.equal(computeCombatAccessForecast(main,[],cards,100,1).seen,size);
  assert.deepEqual(effects.rows[0].points.map(point=>point.seen),actualDrawCheckpoints(size));
 }
});

test('paired source access uses a two-card library without imaginary filler', () => {
 const main = [{name:'A',quantity:1},{name:'B',quantity:1}];
 assert.equal(fixturePairAccess(main,[main[0]],[main[1]],1),0);
 assert.equal(fixturePairAccess(main,[main[0]],[main[1]],2),1);
});

test('empty and exhausted libraries have bounded distinct checkpoints', () => {
 assert.deepEqual(actualDrawCheckpoints(0),[0]);
 assert.deepEqual(actualDrawCheckpoints(2),[2]);
 assert.deepEqual(actualDrawCheckpoints(16),[7,10,15,16]);
 assert.equal(effectAccessReport({main:[],material:[]},cards).size,0);
 assert.equal(computeAggressionForecast([],cards).deckSize,0);
 const combat = computeCombatAccessForecast([],[],cards,20,1);
 assert.equal(combat.seen,0); assert.equal(combat.printedPower,0);
});
