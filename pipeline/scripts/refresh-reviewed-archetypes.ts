import { readFile, writeFile } from 'node:fs/promises';
import { applyReviewedArchetypeEvidence, decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData } from '@gatcg/shared';
const root = new URL('../../data/analysis/', import.meta.url);
const taxonomy: ArchetypeTaxonomyData = JSON.parse(await readFile(new URL('archetype-taxonomy.json', root), 'utf8'));
const index: DeckCardIndexData = JSON.parse(await readFile(new URL('deck-card-index.json', root), 'utf8'));
const cards = new Map(index.decks.map(deck => {
  const counts = new Map<string, number>();
  for (const card of decodeCardLines([...deck.main, ...deck.material], index.cardNames)) if (card.quantity > 0) counts.set(card.name, (counts.get(card.name) ?? 0) + card.quantity);
  return [deck.deckId, counts];
}));
const before = JSON.stringify(taxonomy.clusters);
const oldNames = new Map(taxonomy.strategyArchetypes.map(strategy => [strategy.id, strategy.name]));
applyReviewedArchetypeEvidence(taxonomy.strategyArchetypes, taxonomy.clusters, cards);
if (before !== JSON.stringify(taxonomy.clusters)) throw new Error('Unexpected membership change');
await writeFile(new URL('archetype-taxonomy.json', root), JSON.stringify(taxonomy));
console.log(JSON.stringify(taxonomy.strategyArchetypes.filter(strategy => strategy.reviewedArchetypeEvidence).map(strategy => ({ id: strategy.id, before: oldNames.get(strategy.id), after: strategy.name, variants: strategy.buildIds.length, players: strategy.playerCount, events: strategy.eventCount, ...strategy.reviewedArchetypeEvidence })), null, 2));
