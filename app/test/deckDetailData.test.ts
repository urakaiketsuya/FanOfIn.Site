import assert from 'node:assert/strict';
import test from 'node:test';
import {buildDeckDetailPartitions,decodeCardLines,deckDetailPartition,shortHash,type DeckCardIndexData,type DeckPopularityIndexData} from '@gatcg/shared';

test('deck partitions preserve sideboards and group identical identities including previously unhashed decks',()=>{
 const cards: DeckCardIndexData={generatedAt:'2026-09-01',cardNames:['A','B','Side'],decks:[
  {deckId:'1:1',main:[[0,4]],material:[[1,1]],sideboard:[[2,2]]},
  {deckId:'2:1',main:[[0,4]],material:[[1,1]],sideboard:[]},
 ]};
 const popularity={generatedAt:'2026-09-02',entries:cards.decks.map(deck=>({deckId:deck.deckId,deckHash:null}))} as DeckPopularityIndexData;
 const hash=shortHash('A:4|B:1');
 const partition=buildDeckDetailPartitions(cards,popularity).get(deckDetailPartition(hash))!;
 assert.equal(partition.generatedAt,'2026-09-02');
 assert.deepEqual(partition.popularity.entries.map(row=>row.deckHash),[hash,hash]);
 assert.deepEqual(decodeCardLines(partition.cards.decks[0].sideboard,partition.cards.cardNames),[{name:'Side',quantity:2}]);
 assert.deepEqual(partition.cards.decks[1].sideboard,[]);
});
