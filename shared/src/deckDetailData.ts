import { decodeCardLines, type DeckCardIndexData, type DeckPopularityIndexData } from './analysis-types.js';
import { shortHash } from './hash.js';

export interface DeckDetailData {
  generatedAt: string;
  cards: DeckCardIndexData;
  popularity: DeckPopularityIndexData;
}
export function deckDetailPartition(hash: string): string {
  return ((parseInt(hash,36) >>> 0) % 256).toString(16).padStart(2,'0');
}
export function buildDeckDetailPartitions(cards: DeckCardIndexData, popularity: DeckPopularityIndexData, grouping: "hash" | "champion" = "hash"): Map<string,DeckDetailData> {
  const generatedAt = [cards.generatedAt,popularity.generatedAt].sort().at(-1)!;
  const sightings = new Map(popularity.entries.map(entry=>[entry.deckId,entry]));
  const partitions = new Map<string,DeckDetailData>();
  const dictionaries = new Map<string,Map<number,number>>();
  for (const deck of cards.decks) {
    const sighting = sightings.get(deck.deckId);
    if (!sighting) continue;
    const quantities = new Map<string,number>();
    for(const line of decodeCardLines([...deck.main,...deck.material],cards.cardNames)) quantities.set(line.name,(quantities.get(line.name) ?? 0)+line.quantity);
    const signature = [...quantities].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,quantity])=>`${name}:${quantity}`).join('|');
    const hash = shortHash(signature);
    const key = grouping === "hash" ? deckDetailPartition(hash) : shortHash(sighting.championName ?? "Unknown");
    let partition = partitions.get(key);
    if (!partition) {
      partition = {generatedAt,cards:{generatedAt,cardNames:[],decks:[]},popularity:{generatedAt,entries:[]}};
      partitions.set(key,partition);dictionaries.set(key,new Map());
    }
    const dictionary = dictionaries.get(key)!;
    const remap = (lines: typeof deck.main): typeof deck.main => lines.map(([old,quantity])=>{
      let index = dictionary.get(old);
      if(index === undefined) {index=partition.cards.cardNames.length;partition.cards.cardNames.push(cards.cardNames[old]);dictionary.set(old,index);}
      return [index,quantity];
    });
    partition.cards.decks.push({...deck,main:remap(deck.main),material:remap(deck.material),sideboard:remap(deck.sideboard)});
    partition.popularity.entries.push({...sighting,deckHash:hash});
  }
  return partitions;
}
