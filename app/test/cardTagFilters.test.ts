import assert from 'node:assert/strict';
import test from 'node:test';
import type {Card} from '@gatcg/shared';
import {editionWithTag, emptyFilterState, filterCards} from '../src/features/cards/filters';
import type {CardTagLookup} from '../src/features/cards/cardTags';
const tagged = {uuid:'a', name:'Tagged', editions:[{uuid:'a1',rarity:1,set:{prefix:'DOA'}},{uuid:'a2',rarity:3,set:{prefix:'MRC'}}]} as Card;
const plain = {uuid:'b', name:'Plain', editions:[{uuid:'b1',rarity:1,set:{prefix:'DOA'}}]} as Card;
const lookup: CardTagLookup = {cards:new Map([['a',new Set(['bird','Diana'])]]), editions:new Map([['a2',new Set(['bird'])],['a1',new Set(['Diana'])]])};
test('art tags match any selected tag on any printing',()=>{
 assert.deepEqual(filterCards([tagged,plain],{...emptyFilterState(),tags:new Set(['bird'])},lookup).map(c=>c.name),['Tagged']);
 assert.deepEqual(filterCards([tagged,plain],{...emptyFilterState(),tags:new Set(['fish','Diana'])},lookup).map(c=>c.name),['Tagged']);
 assert.equal(filterCards([tagged,plain],{...emptyFilterState(),tags:new Set(['fish'])},lookup).length,0);
});
test('tag filter waits for data instead of showing unrelated cards',()=>{
 assert.equal(filterCards([tagged,plain],{...emptyFilterState(),tags:new Set(['bird'])}).length,0);
});
test('picks the printing whose art carries the tag',()=>{
 assert.equal(editionWithTag(tagged,{...emptyFilterState(),tags:new Set(['bird'])},lookup)?.uuid,'a2');
 assert.equal(editionWithTag(tagged,{...emptyFilterState(),tags:new Set(['bird']),sets:new Set(['DOA'])},lookup),undefined);
});
