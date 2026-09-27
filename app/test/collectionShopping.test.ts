import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shoppingLines,shoppingBatches} from '../src/features/collection/collectionShopping';
import {buildTcgplayerMassEntryUrl} from '../src/lib/tcgplayerMassEntry';
test('shopping selection starts empty and merges names without including unselected cards',()=>{
 assert.deepEqual(shoppingLines({}),[]);
 assert.deepEqual(shoppingLines({a:{name:'A',quantity:2},b:{name:'A',quantity:1},c:{name:'B',quantity:0},d:{name:'C',quantity:NaN}}),[{name:'A',quantity:3}]);
});
test('large selections are batched without losing cards or quantities',()=>{
 const lines=Array.from({length:123},(_,i)=>({name:`Card ${i} with punctuation, & extra text`,quantity:4}));
 const batches=shoppingBatches(lines);
 assert.deepEqual(batches.flat(),lines);
 assert.ok(batches.every(batch=>batch.length<=50 && buildTcgplayerMassEntryUrl(batch).length<=6000));
 const url=new URL(buildTcgplayerMassEntryUrl(batches[0]));
 assert.equal(url.searchParams.get('productline'),'Grand Archive');
 assert.equal(url.searchParams.get('c'),batches[0].map(line=>`${line.quantity} ${line.name}`).join('||'));
});
