import assert from "node:assert/strict";
import test from "node:test";
import { collectionEntryKey, collectionCompletionLines, collectionTotalsByCard, effectiveBinderItems, binderItemsMatch, computeCollectionValue, priceKey, type Card, type CollectionEntry, type BinderItem, type CardPriceEntry } from "@gatcg/shared";
import { identifyCollectionFinishes } from "../src/features/collection/collectionFinishes";
import { stageCollectionQuantities } from "../src/features/collection/collectionQuantityDrafts";
import { collectionCsv, parseCollectionCsv } from "../src/features/collection/collectionBatch";
const card={uuid:'c',name:'Test "Card", One',editions:[{uuid:'e',set:{prefix:'SET'},collector_number:'1'}]} as Card;
const entry:CollectionEntry={cardUuid:'c',cardName:card.name,ownedQuantity:4,proxyQuantity:2,updatedAt:''};
const item:BinderItem={id:'b',kind:'available',cardUuid:'c',cardName:card.name,editionUuid:null,setPrefix:null,collectorNumber:null,quantity:4,reservedQuantity:0,condition:'Any',language:'Any',acceptsAlternatives:true,updatedAt:''};
test('identifying finishes conserves each printing and preserves proxies',()=>{
 const entries=[entry,{...entry,editionUuid:'e',ownedQuantity:3,proxyQuantity:1}];
 const lines=identifyCollectionFinishes(entries,{'c:canonical':2,'c:canonical:foil':2,'c:e':1,'c:e:foil':2});
 assert.equal(lines.reduce((sum,line)=>sum+line.quantity,0),7);
 assert.equal(lines.reduce((sum,line)=>sum+(line.proxyQuantity??0),0),3);
 assert.throws(()=>identifyCollectionFinishes(entries,{'c:canonical:foil':1}),/must total 4/);
 assert.throws(()=>identifyCollectionFinishes(entries,{'c:e:foil':-1}),/whole quantities/);
 assert.equal(collectionEntryKey(entry),collectionEntryKey({...entry,finish:'unspecified'}));
});
test('quantity drafts and deck completion keep foil and nonfoil pools separate',()=>{
 const entries=[{...entry,finish:'foil' as const},{...entry,finish:'nonfoil' as const,ownedQuantity:1}];
 const drafts=stageCollectionQuantities({},entries,[{...entry,finish:'foil',quantity:2}],'set');
 assert.equal(drafts['c:canonical:foil'].expectedOwnedQuantity,4);
 assert.equal(Object.keys(drafts).length,1);
 assert.equal([...collectionTotalsByCard(entries).values()][0].ownedQuantity,5);
 assert.equal(collectionCompletionLines([{cardUuid:'c',cardName:card.name,quantity:6}],entries)[0].quantity,1);
});
test('CSV round-trips finish and printing without merging pools; legacy rows stay unspecified',()=>{
 const entries=[entry,{...entry,finish:'foil' as const},{...entry,editionUuid:'e',finish:'foil' as const},{...entry,editionUuid:'e',finish:'nonfoil' as const}];
 const parsed=parseCollectionCsv(collectionCsv(entries),[card]);
 assert.deepEqual(parsed.unresolved,[]);
 assert.deepEqual(parsed.lines.map(collectionEntryKey),entries.map(collectionEntryKey));
 assert.equal(parseCollectionCsv('quantity,card\n2,"Test ""Card"", One"',[card]).lines[0].finish,'unspecified');
 assert.equal(parseCollectionCsv(collectionCsv([{...entry,finish:'foil'}]).replace(',foil',',shiny'),[card]).unresolved.length,1);
});
test('availability never substitutes finishes, and foil wants only match foil',()=>{
 const entries=[{...entry,finish:'foil' as const,ownedQuantity:1},{...entry,finish:'nonfoil' as const,ownedQuantity:5}];
 const available=effectiveBinderItems(entries,[],[{...item,id:'foil',finish:'foil'},{...item,id:'normal',finish:'nonfoil'},{...item,id:'unknown'}]);
 assert.deepEqual(available.map(row=>[row.id,row.quantity]),[['foil',1],['normal',4],['unknown',0]]);
 const want={...item,kind:'wanted' as const,finish:'foil' as const};
 assert.equal(binderItemsMatch({...item,finish:'nonfoil'},want),false);
 assert.equal(binderItemsMatch(item,want),false);
 assert.equal(binderItemsMatch({...item,finish:'foil'},want),true);
 assert.equal(binderItemsMatch({...item,finish:'foil'},{...want,finish:'unspecified'}),true);
});
test('foil valuation uses foil quotes without falling back to nonfoil',()=>{
 const prices=new Map([[priceKey('SET','1'),{cardName:card.name,normal:{market:2},foil:{market:10}} as CardPriceEntry]]);
 assert.equal(computeCollectionValue([{...entry,editionUuid:'e',finish:'foil',ownedQuantity:2},{...entry,editionUuid:'e',finish:'nonfoil',ownedQuantity:3}],[card],prices).marketTotal,26);
 prices.get(priceKey('SET','1'))!.foil=null;
 const value=computeCollectionValue([{...entry,editionUuid:'e',finish:'foil'}],[card],prices);
 assert.equal(value.marketTotal,null);assert.equal(value.missingCopies,4);
});
