import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCopyDistributions, type DeckCardIndexData } from '@gatcg/shared';
const data: DeckCardIndexData = { generatedAt:'',cardNames:['A','B','Spirit'],decks:[
 {deckId:'a',main:[[0,1],[0,3]],material:[[2,1]],sideboard:[[1,4]]},
 {deckId:'b',main:[[1,4]],material:[[2,1]],sideboard:[]},
 {deckId:'c',main:[[0,2],[1,2]],material:[],sideboard:[]},
 {deckId:'empty',main:[],material:[[2,1]],sideboard:[]},
]};
const builds = [{id:'one',name:'One',deckIds:['a','a','b','empty','missing']},{id:'two',name:'Two',deckIds:['c']}];
test('equal means retain different distributions, zero copies and available populations',()=>{
 const [main,material] = buildCopyDistributions(builds,[data,data]);
 assert.deepEqual(main.populations.map(p=>[p.requested,p.available]),[[4,2],[1,1]]);
 const row=main.rows.find(r=>r.name==='A')!;
 assert.deepEqual(row.quantities,[0,1,2,3,4]);
 assert.deepEqual(row.values.map(v=>v.buckets.map(b=>b.share)),[[.5,0,0,0,.5],[0,0,1,0,0]]);
 assert.equal(row.difference,1);
 assert.equal(row.values[0].playing,1);
 assert.equal(material.populations[1].available,0);
 assert.equal(material.rows[0].values[1].buckets[0].share,null);
 assert.equal(material.rows[0].difference,0);
});
test('independent dictionaries, section separation, quantities above four, missing versus absence',()=>{
 const other:DeckCardIndexData={generatedAt:'',cardNames:['Spirit','A'],decks:[{deckId:'d',main:[[1,6]],material:[[1,1]],sideboard:[]}]};
 const selected=[...builds,{id:'three',name:'Three',deckIds:['d']},{id:'none',name:'None',deckIds:['missing']}];
 const result=buildCopyDistributions(selected,[data,other]);
 assert.deepEqual(result,buildCopyDistributions(selected,[other,data]));
 const a=result[0].rows.find(r=>r.name==='A')!;
 assert.deepEqual(a.quantities,[0,1,2,3,4,6]);
 assert.equal(a.values[2].buckets.at(-1)!.share,1);
 assert.equal(a.values[3].buckets[0].share,null);
 assert.equal(result[1].rows.find(r=>r.name==='A')!.values[0].buckets[0].share,1);
});
test('identical populations retain cards and invalid Main does not create a list',()=>{
 const invalid: DeckCardIndexData={...data,decks:[{deckId:'bad',main:[[0,1.5],[1,-1]],material:[],sideboard:[]}]};
 const r=buildCopyDistributions([builds[0],{...builds[0],id:'copy'},{id:'bad',name:'Bad',deckIds:['bad']}],[data,invalid]);
 assert(r[0].rows.every(row=>row.difference===0));
 assert.equal(r[0].populations[2].available,0);
 assert.deepEqual(buildCopyDistributions([],[]).map(s=>s.rows),[[],[]]);
});
