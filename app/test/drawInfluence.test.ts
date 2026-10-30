import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateDrawInfluence, type InfluenceDrawSource } from '@gatcg/shared';
const source = (overrides: Partial<InfluenceDrawSource> = {}): InfluenceDrawSource => ({name:'Draw',quantity:20,draws:2,reserve:3,discard:0,...overrides});
test('shared reserve budget limits consecutive casts, returns memory and conserves influence', () => {
 const [first, second] = estimateDrawInfluence([source()],[],4,'first',2,1);
 assert.deepEqual(first,{seen:6,hand:2,memory:3,influence:5,extraAccess:new Map()});
 assert.equal(second.seen,11);
 assert.equal(second.influence,8); // 11 seen minus three sources played
 assert.equal(second.hand + second.memory,second.influence);
});
test('unknown costs do not become free; source cannot pay its own reserve cost', () => {
 for (const reserve of [null,4]) {
  const [point] = estimateDrawInfluence([source({reserve})],[],4,'first',1,1);
  assert.deepEqual(point,{seen:4,hand:4,memory:0,influence:4,extraAccess:new Map()});
 }
});
test('discards reduce influence without reducing cumulative cards seen', () => {
 const [point] = estimateDrawInfluence([source({discard:1})],[],4,'first',1,1);
 assert.deepEqual(point,{seen:6,hand:1,memory:3,influence:4,extraAccess:new Map()});
});
test('material draws wait for materialization and pay memory before recollection', () => {
 const points = estimateDrawInfluence([source()], [source({name:'Material',quantity:1,memory:3,draws:1})],4,'first',2,1);
 assert.equal(points[0].seen,6);
 assert.deepEqual(points[1],{seen:10,hand:2,memory:3,influence:5,extraAccess:new Map()});
});
test('empty decks and exhausted libraries never create cards', () => {
 assert.deepEqual(estimateDrawInfluence([],[],7,'second',1,1),[{seen:0,hand:0,memory:0,influence:0,extraAccess:new Map()}]);
 assert.equal(estimateDrawInfluence([source({quantity:2})],[],7,'second',1,1)[0].seen,2);
});

test('memory draws cannot chain plays until recollection', () => {
 const main = [source({quantity:20,reserve:0,draws:1,drawSteps:[{count:1,destination:'memory'}]})];
 const [first,second] = estimateDrawInfluence(main,[],1,'first',2,1);
 assert.equal(first.seen,2);
 assert.equal(first.hand,0);
 assert.equal(first.memory,1);
 assert.equal(second.seen,5);
 assert.equal(second.hand,0);
 assert.equal(second.memory,2);
 const hand = estimateDrawInfluence([{...main[0],drawSteps:[{count:1,destination:'hand'}]}],[],1,'first',1,1)[0];
 assert.equal(hand.seen,20);
});

test('draws into memory survive a discard from hand', () => {
 const [point] = estimateDrawInfluence([source({quantity:4,reserve:0,draws:1,discard:1,drawSteps:[{count:1,destination:'memory'}]})],[],1,'first',1,1);
 assert.equal(point.hand,0);
 assert.equal(point.memory,1);
 assert.equal(point.influence,1);
});

test('mixed destinations preserve printed order at library exhaustion', () => {
 const [point] = estimateDrawInfluence([source({quantity:2,reserve:0,draws:2,drawSteps:[{count:1,destination:'memory'},{count:1,destination:'hand'}]})],[],1,'first',1,1);
 assert.equal(point.seen,2);
 assert.equal(point.memory,1);
 assert.equal(point.hand,0);
});
