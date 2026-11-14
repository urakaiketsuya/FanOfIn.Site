import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerAdjustedReport, type AdjustedMatch } from './playerAdjustedValidation.js';
import { seasonalPredictions, type SeasonalInput } from './cardSeasonalValidation.js';
const row: AdjustedMatch = { id:'m',event:'e',date:'2026-01-01',format:'standard',score:1,prior:.7,prediction:.75,equalSkill:.55,playerA:'p1',playerB:'p2',a:{identity:'a',champion:'A',cards:[]},b:{identity:'b',champion:'B',cards:[]} };
test('observed residual and equal-skill score remain distinct; both perspectives counted',()=>{
    const report=playerAdjustedReport([row]);
    const a=report.champions.find(c=>JSON.parse(c.key)[1]==='A')!;
    assert.ok(Math.abs(a.abovePlayerExpectation!-.3)<1e-12);
    assert.equal(a.equalSkillAgainstObservedOpponents,.55);
    assert.equal(a.abovePlayerExpectation95,null);
    assert.equal(report.calibration.reduce((n,b)=>n+b.appearances,0),2);
    const swapped=playerAdjustedReport([{...row,a:row.b,b:row.a,playerA:row.playerB,playerB:row.playerA,score:0,prior:.3,prediction:.25,equalSkill:.45}]);
    assert.ok(Math.abs(swapped.champions[0].equalSkillAgainstObservedOpponents!-report.champions[0].equalSkillAgainstObservedOpponents!)<1e-12);
});
test('event uncertainty and pilot concentration; no raw pilot identifiers published',()=>{
    const rows=Array.from({length:20},(_,i)=>({...row,id:String(i),event:String(i)}));
    const report=playerAdjustedReport(rows),a=report.champions.find(c=>JSON.parse(c.key)[1]==='A')!;
    assert.equal(a.pilots,1);assert.equal(a.largestPilotShare,1);
    assert.ok(a.abovePlayerExpectation95!.every(v=>Math.abs(v-.3)<1e-12));
    assert.ok(!JSON.stringify(report).includes('p1'));
    assert.equal(playerAdjustedReport([]).overall.seasonalPredictionError,null);
});
test('equal-skill projection reuses actual-history residuals without changing online training',()=>{
    const first: SeasonalInput={...row,base:.7,equalSkillBase:.5,eventContext:{season:null,completed:row.date}};
    const second={...first,id:'later',date:'2026-01-02'};
    const withEqual=seasonalPredictions([first,second],[],20);
    const without=seasonalPredictions([first,second].map(({equalSkillBase,...r})=>r),[],20);
    for(const id of ['m','later']) {
        assert.equal(withEqual.get(id)!.seasonal,without.get(id)!.seasonal);
        assert.ok(Math.abs(withEqual.get(id)!.seasonal-withEqual.get(id)!.equalSkill!-.2)<1e-12);
    }
    const clipped=seasonalPredictions([{...first,equalSkillBase:.99}, {...second,equalSkillBase:.99}],[],20);
    assert.equal(clipped.get('later')!.equalSkill,.99);
});
test('exact-list reporting requires multiple pilots and events and separates formats',()=>{
    const rows=Array.from({length:20},(_,i)=>({...row,id:String(i),event:String(i%5),playerA:`pilot-${i%3}`}));
    const report=playerAdjustedReport(rows);
    assert.equal(report.deckCoverage.totalExactLists,2);
    assert.equal(report.deckCoverage.reportedExactLists,1);
    assert.equal(JSON.parse(report.decks[0].key)[1],'a');
    const mixed=playerAdjustedReport([...rows,{...row,id:'pantheon',format:'pantheon'}]);
    assert.equal(mixed.deckCoverage.totalExactLists,4);
});
