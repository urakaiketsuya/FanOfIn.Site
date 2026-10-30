import test from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { computeDeckAnalysisReport } from '../src/lib/deckAnalysisReport';
import type { AnalysisPlan } from '../src/lib/analysisProfile';
const main = [{ name: 'A', quantity: 4 }, { name: 'B', quantity: 56 }];
const card = (name: string, effect = '', level: number | null = null) => ({ name, effect, level, types: level === null ? ['ACTION'] : ['CHAMPION'], cost_reserve: 0 }) as Card;
test('access agrees with independent without replacement calculation and both orders', () => {
 const report = computeDeckAnalysisReport(main, [], new Map());
 const miss = Array.from({length:7}, (_, i) => (56-i)/(60-i)).reduce((a,b)=>a*b,1);
 assert.ok(Math.abs(report.cards[0].opening - (1-miss)) < 1e-10);
 assert.deepEqual(report.checkpoints.map(p=>p.seen), [9,10,11,12]);
 assert.equal(report.openingInferred, false);
 assert.deepEqual(report.unresolved, ['A','B']);
});
test('starting draw is not counted again, conditional extra effects remain separate', () => {
 const catalog = new Map([['Spirit',card('Spirit','Draw six cards.',0)], ['A',card('A','If ready, draw two cards.')]]);
 const report = computeDeckAnalysisReport(main,[{name:'Spirit',quantity:1}],catalog);
 assert.equal(report.opening,6); assert.equal(report.openingInferred,true);
 assert.equal(report.sources.length,1); assert.equal(report.sources[0].conditional,true);
 assert.ok(report.checkpoints[0].extra > 0);
 assert.ok(report.cards[0].checkpoints[0].modeled >= report.cards[0].checkpoints[0].natural);
});
test('merge duplicate lines, bound tiny decks and handle empty input', () => {
 const r = computeDeckAnalysisReport([{name:'A',quantity:1},{name:'A',quantity:1}],[],new Map());
 assert.equal(r.cards.length,1); assert.equal(r.cards[0].duplicate,1);
 assert.ok(r.checkpoints.every(p=>p.seen===2 && p.adjustedSeen===2));
 assert.equal(computeDeckAnalysisReport([],[],new Map()).cards.length,0);
});
test('plan requires explicit review and both role pools', () => {
 const plan: AnalysisPlan = {id:'p',name:'Plan',roles:{A:'enabler',B:'payoff'},stageUsefulness:{},pressure:{},resilience:{}};
 assert.equal(computeDeckAnalysisReport(main,[],new Map(),plan,false).plan,null);
 assert.ok(computeDeckAnalysisReport(main,[],new Map(),plan,true).plan!.opening! > 0);
 assert.equal(computeDeckAnalysisReport(main,[],new Map(),{...plan,roles:{A:'enabler'}},true).plan,null);
});
test('draw timing respects explicit checkpoint even when the library is exhausted', () => {
 const catalog = new Map([['A',{...card('A','Draw a card.'),cost_reserve:4}]]);
 const report = computeDeckAnalysisReport([{name:'A',quantity:2}],[],catalog);
 assert.equal(report.checkpoints[0].extra, 0);
 assert.ok(report.checkpoints.every(point=>point.adjustedSeen===2 && point.influence===2));
});

test('reserve payment excludes the played card and uses starting spirit influence', () => {
 const catalog = new Map([['A',{...card('A','Draw two cards.'),cost_reserve:8}], ['Spirit',card('Spirit','Draw six cards.',0)]]);
 const six = computeDeckAnalysisReport(main,[{name:'Spirit',quantity:1}],catalog);
 assert.equal(six.checkpoints[0].extra,0);
 catalog.set('Spirit',card('Spirit','Draw seven cards.',0));
 const seven = computeDeckAnalysisReport(main,[{name:'Spirit',quantity:1}],catalog);
 assert.ok(seven.checkpoints[0].extra > 0);
 assert.deepEqual(seven,computeDeckAnalysisReport(main,[{name:'Spirit',quantity:1}],catalog));
});

test('an engine cannot improve access to its own first copy', () => {
 const catalog = new Map([['Engine',card('Engine','Draw 60 cards.')],['Other',card('Other')]]);
 const report = computeDeckAnalysisReport([{name:'Engine',quantity:1},{name:'Other',quantity:59}],[],catalog);
 const engine = report.cards.find(row=>row.name==='Engine')!;
 assert.equal(engine.checkpoints[0].natural, 0.15);
 assert.equal(engine.checkpoints[0].modeled, 0.15);
 assert.ok(report.checkpoints[0].adjustedSeen > 9, 'other cards are still drawn by the engine');
 for (const point of engine.checkpoints) assert.equal(point.modeled,point.natural);
});

test('without usable extra draws modeled access retains exact natural odds', () => {
 const report = computeDeckAnalysisReport(main,[],new Map());
 for (const row of report.cards) for (const point of row.checkpoints) assert.equal(point.modeled,point.natural);
});

test('other engines increase target access within bounds and deterministically', () => {
 const catalog = new Map([['Engine',card('Engine','Draw 60 cards.')],['Target',card('Target')],['Other',card('Other')]]);
 const main = [{name:'Engine',quantity:1},{name:'Target',quantity:1},{name:'Other',quantity:58}];
 const report = computeDeckAnalysisReport(main,[],catalog);
 const target = report.cards.find(row=>row.name==='Target')!;
 // A target is found if it or the engine is in the natural prefix: exact 2-copy access.
 const exact = 1 - (51*50)/(60*59);
 assert.ok(Math.abs(target.checkpoints[0].modeled-exact) < 0.04);
 assert.ok(target.checkpoints[0].modeled > target.checkpoints[0].natural);
 for (const row of report.cards) for (const point of row.checkpoints) assert.ok(point.modeled>=point.natural && point.modeled<=1);
 assert.deepEqual(report,computeDeckAnalysisReport(main,[],catalog));
});
