import assert from 'node:assert/strict';
import test from 'node:test';
import {cardLocationState,deckCardRequirements,planCardTransfer,type CollectionCardTracking} from '@gatcg/shared';
const record:CollectionCardTracking={cardUuid:'c',cardName:'Card',mightOwn:false,loans:[],assignments:[{deckId:'a',quantity:4}],revision:1,updatedAt:''};
test('one playset moves across decks without creating missing copies',()=>{
 const plan=planCardTransfer('b',4,4,record);
 assert.equal(plan.missing,0);assert.deepEqual(plan.transfers,[{deckId:'a',quantity:4}]);assert.deepEqual(plan.assignments,[{deckId:'b',quantity:4}]);assert.deepEqual(record.assignments,[{deckId:'a',quantity:4}]);
});
test('unassigned copies are consumed before transferring other decks and splits conserve stock',()=>{
 const plan=planCardTransfer('b',4,6,record);
 assert.deepEqual(plan.transfers,[{deckId:'a',quantity:2}]);assert.equal(plan.assignments.reduce((n,row)=>n+row.quantity,0),6);
 const back=planCardTransfer('a',4,6,{...record,assignments:plan.assignments});assert.deepEqual(back.assignments,[{deckId:'b',quantity:2},{deckId:'a',quantity:4}]);
});
test('loaned copies are unavailable rather than a purchase shortfall',()=>{
 const loan={id:'l',borrower:'Alex',quantity:2,lentAt:'2026-09-27'};
 const plan=planCardTransfer('b',4,4,{...record,assignments:[{deckId:'a',quantity:2}],loans:[loan]});
 assert.equal(plan.missing,0);assert.equal(plan.loanBlocked,2);assert.deepEqual(plan.assignments,[{deckId:'b',quantity:2}]);
 const returned=planCardTransfer('b',4,4,{...record,assignments:[],loans:[{...loan,returnedAt:'2026-09-28'}]});assert.equal(returned.loanBlocked,0);
});
test('reconciliation blocks transfers; physical printings pool and proxies do not',()=>{
 const entries=[{cardUuid:'c',cardName:'Card',ownedQuantity:1,proxyQuantity:4,updatedAt:''},{cardUuid:'c',cardName:'Card',ownedQuantity:2,proxyQuantity:0,editionUuid:'foil',updatedAt:''}];
 assert.equal(cardLocationState('c',entries,record).excess,1);assert.equal(planCardTransfer('b',4,3,record).reconcile,true);
});
test('requirements include sideboard and removing a decklist card releases only its assignment',()=>{
 assert.equal(deckCardRequirements({main:[{card:' Card ',quantity:2}],material:[],sideboard:[{card:'card',quantity:1}]}).get('card')?.quantity,3);
 assert.deepEqual(planCardTransfer('a',0,6,{...record,assignments:[{deckId:'a',quantity:4},{deckId:'b',quantity:2}]}).assignments,[{deckId:'b',quantity:2}]);
});
