import assert from 'node:assert/strict';
import test from 'node:test';
import { cardBuildCopies, type DeckCardIndexData } from '@gatcg/shared';
const source: DeckCardIndexData = { generatedAt: '', cardNames: ['Target', 'Other'], decks: [
  {deckId:'1:a',main:[[0,1],[0,2]],material:[[0,1]],sideboard:[[0,4]]},
  {deckId:'1:b',main:[[1,60]],material:[],sideboard:[[0,4]]},
  {deckId:'1:c',main:[],material:[[0,1]],sideboard:[]},
] } as DeckCardIndexData;
test('build copies distinguish inclusion, playing-list counts and unavailable sightings',()=>{
 const rows = cardBuildCopies('Target', [{id:'b',name:'Build',deckIds:['1:a','1:a','1:b','1:c','missing']}], [source,source]);
 assert.deepEqual(rows[0], {id:'b',name:'Build',requested:4,available:2,playing:1,inclusion:.5,buckets:[{quantity:4,deckCount:1}]});
});
test('dictionary partitions preserve cross-champion membership and unknown differs from absent',()=>{
 const other = {generatedAt:'',cardNames:['Other','Target'],decks:[{deckId:'2:a',main:[[1,2]],material:[],sideboard:[]}]} as DeckCardIndexData;
 const rows=cardBuildCopies('Target',[{id:'b',name:'Build',deckIds:['1:a','2:a']},{id:'u',name:'Unknown',deckIds:['missing']},{id:'a',name:'Absent',deckIds:['1:b']}],[source,other]);
 assert.deepEqual(rows[0].buckets,[{quantity:2,deckCount:1},{quantity:4,deckCount:1}]);
 assert.equal(rows.find(r=>r.id==='a')?.inclusion,0);
 assert.equal(rows.find(r=>r.id==='u')?.inclusion,null);
 assert.deepEqual(cardBuildCopies('Target',[],[source]),[]);
});
