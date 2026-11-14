import { test } from 'node:test';
import assert from 'node:assert/strict';
import { competitivePeriod, type BanRegime } from '../../../shared/src/competitivePeriods.js';
import { seasonalPredictions, type SeasonalInput } from './cardSeasonalValidation.js';
const regimes: BanRegime[] = [
    { id: 'old', format: 'standard', effective: '2026-01-01', through: '2026-01-03', source: 'reviewed', changes: [] },
    { id: 'new', format: 'standard', effective: '2026-01-04', through: '2026-12-31', source: 'reviewed', changes: ['Ban X'] },
];
const season = { id: 1, name: 'Official', dateStart: '2026-01-01', dateEnd: '2026-12-31' };
const row = (id: string, date: string, score = 1): SeasonalInput => ({ id, event: id, date, format: 'standard', score, prior: .5, base: .5, a: { identity: 'a', champion: 'A', cards: [['X',4]] }, b: { identity: 'b', champion: 'B', cards: [['Y',4]] }, eventContext: { season, completed: date } });
test('period uses official ID and effective boundary; unknown formats and missing seasons explicit', () => {
    assert.equal(competitivePeriod('2026-01-03','standard',{season,completed:null},regimes).banRegime,'old');
    assert.equal(competitivePeriod('2026-01-04','standard',{season,completed:null},regimes).banRegime,'new');
    assert.equal(competitivePeriod('2026-01-04','pantheon',{season,completed:null},regimes).status,'unverified-bans');
    assert.equal(competitivePeriod('2026-01-04','standard',undefined,regimes).key,null);
    assert.equal(competitivePeriod('2026-01-03','standard',{season,completed:'2026-01-04'},regimes).status,'straddles-boundary');
    assert.equal(competitivePeriod('2027-01-01','standard',{season,completed:null},regimes).status,'unknown-season');
});
test('outcomes cannot affect own/same-day/earlier predictions; later completed results adapt', () => {
    const rows=[row('1','2026-01-01'),row('2','2026-01-01'),row('3','2026-01-02')];
    const a=seasonalPredictions(rows,regimes,20), b=seasonalPredictions(rows.map(r=>r.id==='2'?{...r,score:0}:r),regimes,20);
    assert.deepEqual(a.get('1'),b.get('1')); assert.deepEqual(a.get('2'),b.get('2'));
    assert.ok(a.get('3')!.seasonal>b.get('3')!.seasonal);
    assert.deepEqual(a,seasonalPredictions([...rows].reverse(),regimes,20));
});
test('completion delay and missing completion prevent premature updates', () => {
    const r={...row('1','2026-01-01'),eventContext:{season,completed:'2026-01-03'}};
    const p=seasonalPredictions([r,row('2','2026-01-02'),row('3','2026-01-03'),row('4','2026-01-04')],regimes,20);
    assert.equal(p.get('2')!.global,.5);
    const unknown={...r,eventContext:{season,completed:null}};
    assert.equal(seasonalPredictions([unknown,row('2','2026-01-02')],regimes,20).get('2')!.global,.5);
});
test('season and ban transitions reset local support, retain historical fallback, isolate formats', () => {
    const rows=[row('1','2026-01-01'),row('2','2026-01-02'),row('3','2026-01-04')];
    const p=seasonalPredictions(rows,regimes,20);
    assert.equal(p.get('2')!.localMatches,1);assert.equal(p.get('3')!.localMatches,0);
    assert.equal(p.get('3')!.seasonal,p.get('3')!.global);
    const changed={...rows[1],eventContext:{season:{...season,id:2},completed:rows[1].date}};
    assert.equal(seasonalPredictions([rows[0],changed],regimes,20).get('2')!.localMatches,0);
    assert.equal(seasonalPredictions([rows[0],{...rows[1],format:'pantheon'}],regimes,20).get('2')!.global,.5);
});
test('swap symmetry, mirrors, invalid mass and duplicates', () => {
    const rows=[row('1','2026-01-01'),row('2','2026-01-02')];
    const a=seasonalPredictions(rows,regimes,20),b=seasonalPredictions(rows.map(r=>({...r,a:r.b,b:r.a,base:1-r.base,score:1-r.score})),regimes,20);
    assert.ok(Math.abs(a.get('2')!.seasonal+b.get('2')!.seasonal-1)<1e-12);
    const mirror={...rows[1],b:rows[1].a,base:.7};
    assert.equal(seasonalPredictions([rows[0],mirror],regimes,20).get('2')!.seasonal,.7);
    assert.throws(()=>seasonalPredictions(rows,regimes,0));
    assert.throws(()=>seasonalPredictions([rows[0],rows[0]],regimes,20));
});

test('reviewed ledger separates actual changes, keeps no-change announcements together, and expires', async () => {
    const { readFile } = await import('node:fs/promises');
    const ledger = JSON.parse(await readFile(new URL('../../../data/analysis/competitive-ban-regimes.json', import.meta.url), 'utf8')) as { regimes: BanRegime[] };
    const context={season,completed:null};
    const at=(date:string)=>competitivePeriod(date,'standard',context,ledger.regimes);
    assert.equal(at('2026-02-23').banRegime,at('2026-01-26').banRegime);
    assert.notEqual(at('2026-04-19').banRegime,at('2026-04-20').banRegime);
    assert.equal(at('2026-09-14').banRegime,at('2026-11-02').banRegime);
    assert.equal(at('2026-11-15').status,'unverified-bans');
    for(const r of ledger.regimes){
        assert.ok(r.effective<=r.through);
        assert.ok(r.source.startsWith('https://www.gatcg.com/article/'));
        assert.equal(ledger.regimes.filter(other=>other.format===r.format&&other.effective<=r.through&&other.through>=r.effective).length,1);
    }
});
