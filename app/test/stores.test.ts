import assert from 'node:assert/strict';
import test from 'node:test';
import { filterStores, buildStoreDirectory, storeDistanceKm, storeMatches, validStoreCoordinates, type OmnidexEventSummary } from '../../shared/src/index';
const event = (overrides: Partial<OmnidexEventSummary> = {}): OmnidexEventSummary => ({ id: 1, hostId: 10, hostName: 'Café Cards', hostAddress: '123 Main St, Boston 02110', hostCountry: 'US', date: '2026-01-01T00:00:00Z', setting: 'physical', status: 'complete', ...overrides } as OmnidexEventSummary);
test('directory groups stable hosts, keeps aliases, selects newest address independently of input order', () => {
 const events = [event(), event({ id:2, date:'2026-02-01T00:00:00Z', hostName:'New Cards', hostAddress:'456 Main St' }), event({id:3,hostId:20,hostName:'New Cards'}),event({id:4,hostId:30,setting:'online'}),event({id:5,hostId:0})];
 const stores = buildStoreDirectory(events, [{hostId:10,lat:42,lng:-71}]);
 assert.equal(stores.length,2);
 const store = stores.find(s=>s.id===10)!;
 assert.equal(store.address,'456 Main St'); assert.equal(store.eventCount,2); assert.equal(store.coordinates,undefined);
 assert.ok(storeMatches(store,'cafe')); assert.ok(storeMatches(store,'456 MAIN'));
 assert.deepEqual(buildStoreDirectory([...events].reverse(),[]),stores);
 assert.equal(store.recentEvents[0].id,2);
});
test('coordinates require valid ranges and address compatibility; explicit overrides can correct or suppress',()=>{
 const es=[event()];
 assert.ok(buildStoreDirectory(es,[{hostId:10,lat:42,lng:-71}])[0].coordinates);
 assert.equal(buildStoreDirectory(es,[{hostId:10,lat:42,lng:-71,address:'Old address'}])[0].coordinates,undefined);
 assert.equal(buildStoreDirectory(es,[{hostId:10,lat:142,lng:-71}])[0].coordinates,undefined);
 const overrides={10:{kind:'venue' as const,address:'Corrected',coordinates:{lat:43,lng:-72},evidence:'Reviewed'}};
 assert.equal(buildStoreDirectory(es,[],overrides)[0].coordinates?.lat,43);
 assert.equal(buildStoreDirectory(es,[{hostId:10,lat:42,lng:-71}],{10:{coordinates:null,evidence:'Incorrect'}})[0].coordinates,undefined);
 assert.equal(validStoreCoordinates({lat:0,lng:0}),false);
});
test('distance is finite, symmetric and correct at the equator',()=>{
 assert.equal(storeDistanceKm({lat:0,lng:0},{lat:0,lng:0}),0);
 assert.ok(Math.abs(storeDistanceKm({lat:0,lng:0},{lat:0,lng:1})-111.195)<0.01);
 assert.equal(storeDistanceKm({lat:40,lng:-70},{lat:42,lng:-72}),storeDistanceKm({lat:42,lng:-72},{lat:40,lng:-70}));
});

test('filters combine text, country, activity and distance while preserving unmapped results', () => {
 const stores = buildStoreDirectory([event(),event({id:2,hostId:11,hostCountry:'CA',hostName:'Other',date:'2025-01-01T00:00:00Z'})],[{hostId:10,lat:42,lng:-71}]);
 const base = {query:'',country:'',region:'',days:0,radius:0};
 assert.equal(filterStores(stores,base).length,2);
 assert.equal(filterStores(stores,{...base,query:'cafe',country:'US'}).length,1);
 assert.equal(filterStores(stores,{...base,country:'US',query:'absent'}).length,0);
 assert.equal(filterStores(stores,{...base,days:30},Date.parse('2026-01-15')).length,1);
 assert.equal(filterStores(stores,{...base,radius:25}).length,2);
 assert.equal(filterStores(stores,{...base,radius:25,position:{lat:42,lng:-71}}).length,1);
 assert.equal(filterStores(stores,{...base,position:{lat:42,lng:-71}})[1].distance,undefined);
});
