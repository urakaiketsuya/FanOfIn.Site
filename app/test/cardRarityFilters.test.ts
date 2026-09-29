import assert from 'node:assert/strict';
import test from 'node:test';
import type {Card} from '@gatcg/shared';
import {emptyFilterState, filterCards, matchesEdition} from '../src/features/cards/filters';
import {emptyCatalogFilters, filterCatalog} from '../src/components/deck-editor/catalogFilters';
import {rarityOptions} from '../src/features/cards/rarities';
const card = {name:'Test', editions:[{rarity:1,set:{prefix:'DOA'},illustrator:'Alpha'},{rarity:7,set:{prefix:'DOA 1st'},illustrator:'Beta'},{rarity:3,set:{prefix:'MRC'},illustrator:'Gamma'}]} as Card;
test('rarity and set restrictions must match the same printing',()=>{
 const filters={...emptyFilterState(),sets:new Set(['MRC']),rarities:new Set(['7'])};
 assert.equal(filterCards([card],filters).length,0);
 filters.sets=new Set(['DOA']);
 assert.equal(filterCards([card],filters).length,1);
 assert.equal(card.editions.find(ed=>matchesEdition(ed,filters))?.rarity,7);
 assert.equal(filterCards([card],{...filters,printingSets:new Set(['DOA'])}).length,0);
 assert.equal(filterCards([card],{...filters,artist:'Alpha'}).length,0);
});
test('multiple rarities match either and reset restores all cards',()=>{
 assert.equal(filterCards([card],{...emptyFilterState(),rarities:new Set(['2','3'])}).length,1);
 assert.equal(filterCards([card],{...emptyFilterState(),rarities:new Set(['2'])}).length,0);
 assert.equal(filterCards([card],emptyFilterState()).length,1);
 assert.deepEqual(rarityOptions([card]).map(o=>o.text),['Common','Rare','Collector Super Rare']);
});
test('deck editor uses the same rarity matching',()=>{
 assert.equal(filterCatalog([card],'',{...emptyCatalogFilters(),rarity:'7'}).length,1);
 assert.equal(filterCatalog([card],'',{...emptyCatalogFilters(),rarity:'2'}).length,0);
});
test('search includes names and rules text on reverse faces', () => {
 const doubleSided = {
  ...card,
  name: 'Front Face',
  effect: 'Front rules text',
  editions: [{
   ...card.editions[0],
   other_orientations: [{ name: 'Reverse Face', effect: 'Reverse rules text' }],
  }],
 } as Card;
 assert.equal(filterCards([doubleSided], { ...emptyFilterState(), name: 'reverse face' }).length, 1);
 assert.equal(filterCards([doubleSided], { ...emptyFilterState(), name: 'reverse rules' }).length, 1);
 assert.equal(filterCatalog([doubleSided], 'reverse face', emptyCatalogFilters()).length, 1);
});
