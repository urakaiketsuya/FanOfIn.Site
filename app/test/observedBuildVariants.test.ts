import assert from 'node:assert/strict';
import test from 'node:test';
import { observedBuildVariants, type DeckCardIndexData } from '@gatcg/shared';
const source: DeckCardIndexData = {generatedAt:'',cardNames:['A','B','Spirit'],decks:[
 {deckId:'1:1',main:[[0,1],[0,2]],material:[[2,1]],sideboard:[[1,4]]},
 {deckId:'1:2',main:[[0,3]],material:[[2,1]],sideboard:[]},
 {deckId:'1:3',main:[[0,2],[1,1]],material:[[2,1]],sideboard:[]},
 {deckId:'1:4',main:[],material:[[2,1]],sideboard:[]},
]};
test('exact lists aggregate sightings, not sideboards or missing lists',()=>{
 const report=observedBuildVariants(['1:1','1:1','1:2','1:3','1:4','missing'],[source,source]);
 assert.equal(report.requested,5);assert.equal(report.available,3);assert.equal(report.variants.length,2);
 assert.equal(report.variants[0].share,2/3);assert.deepEqual(report.variants[0].changes,[]);
 assert.deepEqual(report.variants[1].changes,[{section:'main',name:'A',delta:-1},{section:'main',name:'B',delta:1}]);
});
test('partitions decode independently, preserve sections and deterministic ties',()=>{
 const other:DeckCardIndexData={generatedAt:'',cardNames:['Spirit','A'],decks:[{deckId:'2:1',main:[[1,3]],material:[[0,1]],sideboard:[]},{deckId:'2:2',main:[[1,2],[0,1]],material:[[1,1]],sideboard:[]}]};
 const ids=['1:1','2:1','2:2']; const r=observedBuildVariants(ids,[other,source]);
 assert.equal(r.variants[0].deckIds.length,2);assert.equal(r.variants.length,2);
 assert.deepEqual(r,observedBuildVariants(ids,[source,other]));
 assert.deepEqual(r.variants[1].changes,[{section:'main',name:'A',delta:-1},{section:'main',name:'Spirit',delta:1},{section:'material',name:'A',delta:1},{section:'material',name:'Spirit',delta:-1}]);
 assert.deepEqual(observedBuildVariants(['unknown'],[source]),{requested:1,available:0,variants:[]});
});
test('invalid quantities and absent Main lists never become observations; tie order is stable',()=>{
 const partition: DeckCardIndexData={...source,decks:[
  {deckId:'bad',main:[[0,NaN],[0,-1],[0,1.5]],material:[],sideboard:[]},
  {deckId:'b',main:[[1,2]],material:[],sideboard:[]},
  {deckId:'a',main:[[0,2]],material:[],sideboard:[]},
 ]};
 const result=observedBuildVariants(['bad','b','a'],[partition]);
 assert.equal(result.available,2);assert.equal(result.variants[0].main[0].name,'A');
 assert.deepEqual(result,observedBuildVariants(['bad','b','a'],[{...partition,decks:[...partition.decks].reverse()}]));
});
