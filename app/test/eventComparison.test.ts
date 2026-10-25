import test from 'node:test';
import assert from 'node:assert/strict';
import { precedingEventCandidates, compareEventFields, isCompletedPrecedingEvent, type OmnidexEvent, type OmnidexEventSummary, type EventReport } from '@gatcg/shared';
const event = { id: 10, date: '2026-06-10', season: { id: 7 }, format: 'standard', category: 'store-championships', setting: 'physical', ranked: true, type: 'single-elimination', structure: 'rounds' } as OmnidexEvent;
const earlier = (id: number, date = '2026-06-09') => ({ ...event, id, date, seasonId: 7, status: 'complete' }) as unknown as OmnidexEventSummary;
test('nearest three events use compatible metadata, never deck availability, with deterministic ties', () => {
  const entries = [earlier(1), earlier(2), earlier(3), earlier(4), { ...earlier(5), publicDecklistCount: 0 }];
  assert.deepEqual(precedingEventCandidates(event, [...entries, entries[4]]).map(e => e.id), [5, 4, 3]);
  for (const change of [{format:'pantheon'}, {seasonId:8}, {category:'regular'}, {setting:'online'}, {ranked:false}, {type:'swiss'}, {structure:'other'}, {status:'active'}, {date:'2026-06-10'}, {date:'2026-02-01'}, {date:'bad'}, {id:10}]) {
    assert.equal(precedingEventCandidates(event, [{ ...earlier(1), ...change }]).length, 0);
  }
  assert.equal(precedingEventCandidates({...event,season:null}, entries).length,0);
});
const report = (a: number, b: number): EventReport => ({ status:null, entrants:a+b, cut:2, average:0, champions: [['A',a],['B',b]].filter(([, n])=>Number(n)>0).map(([name,n])=>({name:String(name),cardName:String(name),entrants:Number(n),advanced:0,rate:0,fieldShare:Number(n)/(a+b)*100,topCutShare:0,cards:[]})) });
test('pooled entrants weight fields by attendance; absent champions remain visible', () => {
  const result=compareEventFields(report(10,0),[report(1,9),report(2,8),report(27,3)])!;
  const a=result.champions.find(c=>c.name==='A')!;
  assert.equal(result.entrants,50);assert.equal(a.previousShare,60);assert.equal(a.currentShare,100);assert.equal(a.change,40);
  assert.equal(result.champions.find(c=>c.name==='B')!.currentShare,0);
  assert.equal(result.champions.reduce((n,c)=>n+c.previousShare,0),100);
});
test('partial cohorts remain unavailable rather than zero or an average of survivors',()=>{
 const r=report(2,2);
 assert.equal(compareEventFields(r,[r,r]),null);
 assert.equal(compareEventFields(r,[r,r,{...r,status:'Missing lists'}]),null);
 assert.equal(compareEventFields({...r,status:'Missing lists'},[r,r,r]),null);
});

test('refreshed events must have completed before the target and still match its cohort', () => {
 const previous = {...event, id: 2, date: '2026-06-09', dateCompleted: '2026-06-09T21:00:00Z', status: 'complete'};
 assert.equal(isCompletedPrecedingEvent(event,previous),true);
 for (const dateCompleted of [null, 'bad', '2026-06-10', '2026-06-11']) assert.equal(isCompletedPrecedingEvent(event,{...previous,dateCompleted}),false);
 assert.equal(isCompletedPrecedingEvent(event,{...previous,format:'pantheon'}),false);
});
