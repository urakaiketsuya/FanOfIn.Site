import test from 'node:test';
import assert from 'node:assert/strict';
import { reservableObjects, restReserveObjects, type PaymentObject } from '../../shared/src/analyticsObjectPayments.ts';
test('overlapping grants share one physical object and one rest state', () => {
 const objects: PaymentObject[] = [
  {name:'Obelisk of Fabrication',domain:true,token:true,rested:false},
  {name:'Automaton Drone',domain:false,token:true,rested:false},
 ];
 assert.equal(reservableObjects(objects,true,true).length,2);
 assert.deepEqual(restReserveObjects(objects,1,true,true),{count:1,domains:1,tokens:0});
 assert.equal(reservableObjects(objects,false,true).length,1); // losing Kingdom cannot wake the Obelisk
 assert.deepEqual(restReserveObjects(objects,2,true,true),{count:1,domains:0,tokens:1});
 assert.equal(reservableObjects(objects,true,true).length,0);
 for (const object of objects) object.rested=false;
 assert.equal(reservableObjects(objects,true,false).length,1);
});
test('rest costs exclude the source even when it also has reservable', () => {
 const source: PaymentObject = {name:'Obelisk of Fabrication',domain:true,token:true,rested:true};
 assert.equal(restReserveObjects([source],1,true,true).count,0);
});
