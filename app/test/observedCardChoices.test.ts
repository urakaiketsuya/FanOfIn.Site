import test from 'node:test';
import assert from 'node:assert/strict';
import { observedCardChoices, observedPackageVariants, type DeckCardIndexData, type PublishedCardPackage } from '@gatcg/shared';
const source: DeckCardIndexData = {generatedAt:'',cardNames:['A','B','Core','Spirit','Other'],decks:[
 {deckId:'e:a', main:[[0,1],[0,2],[2,4]],material:[[3,1]],sideboard:[]},
 {deckId:'e:b', main:[[1,3],[2,4]],material:[[3,1]],sideboard:[[0,4]]},
 {deckId:'e:c', main:[[1,2],[2,4]],material:[[3,1]],sideboard:[]},
 {deckId:'e:d', main:[[1,3],[2,4]],material:[[4,1]],sideboard:[]},
 {deckId:'e:missing',main:[],material:[],sideboard:[]},
]};
const build = {id:'build',name:'Build',deckIds:source.decks.map(d=>d.deckId)};
test('choices require equal copies, same section, identical remainder and membership; sideboards do not interfere',()=>{
 const rows=observedCardChoices('A',[build],[source,source]);
 assert.equal(rows.length,1);assert.equal(rows[0].name,'B');assert.equal(rows[0].quantity,3);
 assert.deepEqual(rows[0].withCard,['e:a']);assert.deepEqual(rows[0].alternative,['e:b']);assert.deepEqual(rows[0].pair,['e:a','e:b']);
 assert.deepEqual(observedCardChoices('A',[{...build,deckIds:['e:a','e:c','e:d']}],[source]),[]);
});
test('independent dictionaries and duplicate membership retain unique sightings and deterministic matching pair',()=>{
 const other:DeckCardIndexData={generatedAt:'',cardNames:['Spirit','Core','B'],decks:[{deckId:'e:z',main:[[2,3],[1,4]],material:[[0,1]],sideboard:[]}]};
 const b={...build,deckIds:[...build.deckIds,'e:z','e:z']};
 const a=observedCardChoices('A',[b],[source,other]);
 assert.deepEqual(a[0].alternative,['e:b','e:z']);assert.deepEqual(a,observedCardChoices('A',[b],[other,source]));
});
const pkg:PublishedCardPackage={id:'test',revision:1,label:'Test',explanation:'',activation:'',memberCards:['A','B','Core'],requirements:[{section:'main',cards:['A','B'],minimum:1},{section:'main',cards:['Core'],minimum:1}],protection:{mode:'none'},evidence:[],materialChampionPrefix:'Spirit'};
test('package variants preserve exact quantities, exclude missing lists and wrong lineage, and count partials separately',()=>{
 const data={...source,decks:[...source.decks,{deckId:'e:p',main:[[0,2]] as [number,number][],material:[[3,1]] as [number,number][],sideboard:[[2,4]] as [number,number][]}]};
 const r=observedPackageVariants([pkg],[data,data])[0];
 assert.equal(r.eligible,4);assert.equal(r.complete,3);assert.equal(r.partial,1);assert.equal(r.variants.length,3);
 assert.ok(r.variants.every(v=>v.share===1/3));
 assert.equal(r.variants.reduce((n,v)=>n+v.deckIds.length,0),3);
 assert.deepEqual(observedPackageVariants([pkg],[{...source,decks:[]}])[0],{id:'test',eligible:0,partial:0,complete:0,variants:[]});
});
test('a requirement counts distinct names, not copies; wrong section does not complete it',()=>{
 const strict={...pkg,requirements:[{section:'main' as const,cards:['A','B'],minimum:2}]};
 assert.equal(observedPackageVariants([strict],[source])[0].complete,0);
});
test('package projection merges unrelated deck differences and sideboards, with shares among complete lists only',()=>{
 const data:DeckCardIndexData={...source,decks:[source.decks[0],{...source.decks[0],deckId:'e:another',main:[...source.decks[0].main,[4,2]],sideboard:[[1,4]]},source.decks[1]]};
 const r=observedPackageVariants([pkg],[data])[0];
 assert.equal(r.complete,3);assert.equal(r.variants.length,2);assert.equal(r.variants[0].share,2/3);assert.deepEqual(r.variants[0].deckIds,['e:a','e:another']);
});
test('invalid quantities cannot create an available list or complete a package',()=>{
 const data:DeckCardIndexData={...source,decks:[{deckId:'bad',main:[[0,NaN],[2,-1],[1,0.5]],material:[[3,1]],sideboard:[]},{deckId:'partial',main:[[0,1],[2,0]],material:[[3,1]],sideboard:[]}]};
 const r=observedPackageVariants([pkg],[data])[0];assert.equal(r.eligible,1);assert.equal(r.partial,1);assert.equal(r.complete,0);
});
