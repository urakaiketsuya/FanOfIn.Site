import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonFieldReport, type OmnidexEventSummary } from '@gatcg/shared';
const event = (id: number, month: string, counts?: number[]) => ({ id, date: `${month}-15`, status: 'complete', format: 'standard', fieldComposition: counts && { entrants: counts.reduce((a,b)=>a+b,0), champions: counts.map((count,i)=>({name:String(i),count})).filter(c=>c.count>0) } }) as OmnidexEventSummary;
test('pooled entries, monthly coverage, absent champions and deduplication', () => {
 const a=event(1,'2026-01',[10,0]);
 const [report]=seasonFieldReport([a,a,event(2,'2026-01',[0,30]),event(3,'2026-01'),event(4,'2026-02',[10,0])]);
 assert.equal(report.months[0].events,3);assert.equal(report.months[0].completeEvents,2);
 assert.deepEqual(report.champions.find(c=>c.name==='0')!.shares,[25,100]);
 assert.deepEqual(report.champions.find(c=>c.name==='1')!.shares,[75,0]);
});
test('missing month remains unavailable, formats stay separate, invalid fields excluded',()=>{
 const bad=event(3,'2026-03',[1]);bad.fieldComposition!.entrants=4;
 const reports=seasonFieldReport([event(1,'2025-12',[2]),event(2,'2026-02',[2]),bad,{...event(4,'2026-03',[3]),format:'draft'},{...event(5,'2026-03',[3]),status:'active'},{...event(6,'2026-03',[3]),format:'team standard'}]);
 assert.equal(reports.length,2);
 const report=reports.find(r=>r.format==='standard')!;
 assert.deepEqual(report.months.map(m=>m.month),['2026-02','2026-03']);assert.deepEqual(report.champions[0].shares,[100,null]);
});
