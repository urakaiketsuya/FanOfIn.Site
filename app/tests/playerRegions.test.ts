import test from 'node:test';
import assert from 'node:assert/strict';
import { assignUSPlayerRegions, type OmnidexEventSummary, type OmnidexPlayerSummary, type StoreRecord } from '@gatcg/shared';
const event = (id:number, state='CA', category='regular', extra={}) => ({id, date:`2026-10-${String(id).padStart(2,'0')}T00:00:00Z`,hostCountry:'US',hostAddress:`City, ${state} 12345, USA`,hostId:1,setting:'physical',status:'complete',category,name:'Weekly',...extra}) as OmnidexEventSummary;
const player = (events:OmnidexEventSummary[], country='US') => ({id:1,country,eventIds:events.map(e=>e.id)}) as OmnidexPlayerSummary;
const run = (events:OmnidexEventSummary[], stores:StoreRecord[]=[]) => assignUSPlayerRegions([player(events)],events,stores,'2026-10-30').get(1)!;
test('repeated locals outweigh travel to major events',()=>{
 const events=[event(1),event(2),event(3),...Array.from({length:7},(_,i)=>event(i+4,'NY','ascent'))];
 assert.equal(run(events).region,'us-west'); assert.equal(run(events).basis,'local');
});
test('thin or mixed history stays unassigned; broader history needs a clear majority',()=>{
 assert.equal(run([event(1)]).region,null);
 assert.equal(run([event(1),event(2),event(3,'NY'),event(4,'NY')]).region,null);
 assert.equal(run([event(1,'TX','ascent'),event(2,'TX','ascent'),event(3,'TX','ascent'),event(4,'NY','ascent')]).region,'us-central');
});
test('duplicates and multiple events on one date cannot manufacture evidence',()=>{
 const events=[event(1),event(2,'CA','regular',{date:event(1).date}),event(3,'CA','regular',{date:event(1).date})];
 assert.equal(run([...events,...events]).region,null); assert.equal(run(events).observedDays,1);
});
test('exclude online, future, old, incomplete and non-US observations',()=>{
 const events=[event(1,'CA','regular',{setting:'online'}),event(2,'CA','regular',{date:'2027-01-01'}),event(3,'CA','regular',{date:'2024-01-01'}),event(4,'CA','regular',{status:'pending'}),event(5,'CA','regular',{hostCountry:'CA'})];
 assert.equal(run(events).observedDays,0);
 assert.equal(assignUSPlayerRegions([player(events,'CA')],events,[],'2026-10-30').size,0);
});
test('known store can resolve missing addresses, but conflicting history prevents fallback',()=>{
 const events=[event(1,'CA','regular',{hostAddress:''}),event(2,'CA','regular',{hostAddress:''}),event(3,'CA','regular',{hostAddress:''})];
 const stores=[{id:1,country:'US',kind:'store',address:'Dallas, TX 75001, USA'}] as StoreRecord[];
 assert.equal(run(events,stores).region,'us-central');
 assert.equal(run([...events,event(4,'NY')],stores).region,null);
});
