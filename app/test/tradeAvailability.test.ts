import assert from 'node:assert/strict';
import test from 'node:test';
import {tradeAvailability,effectiveBinderItems,cardLocationState,planCardTransfer,type BinderItem,type CollectionEntry,type CollectionCardTracking} from '@gatcg/shared';
const entries=[{cardUuid:'c',cardName:'Card',ownedQuantity:8,proxyQuantity:20}] as CollectionEntry[];
const record={cardUuid:'c',assignments:[{deckId:'d',quantity:4}],loans:[{quantity:1}],tradeReservedQuantity:1} as CollectionCardTracking;
const item=(id:string,quantity:number,reservedQuantity=0)=>({id,kind:'available',cardUuid:'c',editionUuid:null,quantity,reservedQuantity}) as BinderItem;
test('listable copies exclude decks, loans and existing listings without double subtracting reservations',()=>{
 const state=tradeAvailability('c',entries,record,[item('a',2,1)]);
 assert.equal(state.listable,1);assert.equal(state.free,2);
 assert.equal(cardLocationState('c',entries,record).unassigned,2);
 assert.equal(planCardTransfer('d',8,8,record).assignments[0].quantity,6);
});
test('effective listings share free capacity and preserve accepted reservations',()=>{
 const effective=effectiveBinderItems(entries,[record],[item('b',3),item('a',2,1)]);
 assert.deepEqual(effective.map(i=>[i.id,i.quantity]),[['a',2],['b',1]]);
});
test('printing pools cannot substitute for each other',()=>{
 const printing={...item('p',4),editionUuid:'rare'};
 assert.equal(effectiveBinderItems(entries,[],[printing])[0].quantity,0);
 assert.equal(tradeAvailability('c',[{...entries[0],ownedQuantity:0}],undefined,[]).free,0);
});
