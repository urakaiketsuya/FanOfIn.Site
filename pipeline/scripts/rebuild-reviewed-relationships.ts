import { readFile, writeFile } from 'node:fs/promises';
import { decodeCardLines, evaluateReviewedRelationships, type ArchetypeTaxonomyData, type DeckCardIndexData } from '@gatcg/shared';
const root = new URL('../../', import.meta.url);
const taxonomyPath = new URL('data/analysis/archetype-taxonomy.json', root);
const taxonomy: ArchetypeTaxonomyData = JSON.parse(await readFile(taxonomyPath, 'utf8'));
const index: DeckCardIndexData = JSON.parse(await readFile(new URL('data/analysis/deck-card-index.json', root), 'utf8'));
const decks = index.decks.map(deck => {
  const [eventId, player] = deck.deckId.split(':');
  return { deckId: deck.deckId, eventId, player, cardCounts: new Map(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter(c => c.quantity > 0).map(c => [c.name, c.quantity])) };
});
taxonomy.reviewedRelationships = evaluateReviewedRelationships(taxonomy.strategyArchetypes, taxonomy.clusters, decks);
await writeFile(taxonomyPath, JSON.stringify(taxonomy));
for (const relationship of taxonomy.reviewedRelationships) console.log(relationship.name, {
  supportedFamilies: relationship.families.filter(f => f.evidence.supported).length,
  supportedBuilds: relationship.families.flatMap(f => f.builds).filter(b => b.evidence.supported).length,
});
