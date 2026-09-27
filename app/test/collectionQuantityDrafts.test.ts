import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stageCollectionQuantities} from '../src/features/collection/collectionQuantityDrafts';
const saved=[{cardUuid:'card',cardName:'Card',ownedQuantity:2,proxyQuantity:1,updatedAt:''}];
test('repeated edits merge by card and printing, preserving independent pools',()=>{
 let draft=stageCollectionQuantities({},saved,[{cardUuid:'card',cardName:'Card',quantity:3,proxyQuantity:1}],'set');
 draft=stageCollectionQuantities(draft,saved,[{cardUuid:'card',cardName:'Card',quantity:4,proxyQuantity:1},{cardUuid:'card',cardName:'Card',editionUuid:'foil',quantity:1}],'set');
 assert.equal(Object.keys(draft).length,2); assert.equal(draft['card:canonical'].quantity,4); assert.equal(draft['card:foil'].quantity,1); assert.equal(saved[0].ownedQuantity,2);
});
test('bulk add and at-least compose against unsaved quantities',()=>{
 let draft=stageCollectionQuantities({},saved,[{cardUuid:'card',cardName:'Card',quantity:2}],'add');
 draft=stageCollectionQuantities(draft,saved,[{cardUuid:'card',cardName:'Card',quantity:3}],'at-least');
 assert.equal(draft['card:canonical'].quantity,4);
 draft=stageCollectionQuantities(draft,saved,[{cardUuid:'card',cardName:'Card',quantity:0}],'set');
 assert.equal(draft['card:canonical'].quantity,0);
});
test('returning to the saved quantity removes the pending write',()=>{
 const draft=stageCollectionQuantities({},saved,[{cardUuid:'card',cardName:'Card',quantity:5,proxyQuantity:1}],'set');
 assert.deepEqual(stageCollectionQuantities(draft,saved,[{cardUuid:'card',cardName:'Card',quantity:2,proxyQuantity:1}],'set'),{});
});
