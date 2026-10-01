import assert from 'node:assert/strict';
import test from 'node:test';
import {deckLocationSummary, type CollectionCardTracking} from '@gatcg/shared';
const deck = {main:[{card:'Card',quantity:4}],material:[],sideboard:[{card:'Card',quantity:1}]};
const cards = [{name:'Card',uuid:'c'}];
const entries = [{cardUuid:'c',cardName:'Card',ownedQuantity:4,proxyQuantity:9,updatedAt:''}];
const record: CollectionCardTracking = {cardUuid:'c',cardName:'Card',mightOwn:false,revision:1,updatedAt:'',loans:[{id:'loan',borrower:'Sam',quantity:1,lentAt:'2026-09-01'}],tradeReservedQuantity:1,assignments:[{deckId:'other',quantity:2}]};
test('deck availability separates purchases, loans, reservations and transfers', () => {
 const result=deckLocationSummary(deck,cards,entries,[record]);
 assert.deepEqual([result.required,result.owned,result.available,result.missing,result.blocked,result.move],[5,4,2,1,2,2]);
 assert.equal(result.reconcile,false);
 assert.equal(deckLocationSummary(deck,cards,entries,[record],false).missing,0);
 assert.equal(deckLocationSummary(deck,cards,entries,[record],false,'other').move,0);
});
test('returned loans restore availability without changing ownership; proxies never fill a shortage', () => {
 const returned={...record,loans:record.loans.map(loan=>({...loan,returnedAt:'2026-09-02'}))};
 const result=deckLocationSummary(deck,cards,entries,[returned]);
 assert.equal(result.available,3);assert.equal(result.owned,4);assert.equal(result.missing,1);
});
test('unknown catalog data and overassigned inventory cannot imply readiness', () => {
 assert.equal(deckLocationSummary(deck,[],entries,[record]).unresolved,1);
 assert.equal(deckLocationSummary(deck,cards,entries,[{...record,assignments:[{deckId:'other',quantity:4}]}]).reconcile,true);
 const empty=deckLocationSummary({main:[],material:[],sideboard:[]},cards,entries,[record]);
 assert.equal(empty.required,0);assert.equal(empty.move,0);
});
test('normalized names and multiple printings pool while requirements sum across sections', () => {
 const result=deckLocationSummary({...deck,main:[{card:' card ',quantity:4}]},cards,[...entries,{...entries[0],editionUuid:'foil',ownedQuantity:2}],[]);
 assert.equal(result.required,5);assert.equal(result.owned,5);assert.equal(result.available,5);assert.equal(result.unresolved,0);
});

test('missing catalog data does not erase recorded ownership', () => {
 const result=deckLocationSummary(deck,[],entries,[record]);
 assert.equal(result.owned,4);assert.equal(result.available,2);assert.equal(result.unresolved,1);
});
