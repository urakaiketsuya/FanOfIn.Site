import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyReviewedArchetypeEvidence, decodeCardLines, REVIEWED_ARCHETYPE_CORES, type ArchetypeTaxonomyData, type DeckCardIndexData } from '@gatcg/shared';
const taxonomy: ArchetypeTaxonomyData = JSON.parse(readFileSync(new URL('../../../data/analysis/archetype-taxonomy.json', import.meta.url), 'utf8'));
const index: DeckCardIndexData = JSON.parse(readFileSync(new URL('../../../data/analysis/deck-card-index.json', import.meta.url), 'utf8'));
const cards = new Map(index.decks.map(deck => [deck.deckId, new Map(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter(c => c.quantity > 0).map(c => [c.name, c.quantity]))]));
test('published families retain all memberships and stats, and refresh is idempotent', () => {
  const copy = structuredClone(taxonomy);
  applyReviewedArchetypeEvidence(copy.strategyArchetypes, copy.clusters, cards);
  assert.deepEqual(copy, taxonomy);
  for (const identity of REVIEWED_ARCHETYPE_CORES) assert.equal(copy.strategyArchetypes.filter(s => s.name === identity.name).length, 1);
});
test('missing data, ambiguous cores and insufficient recurrence restore generated label', () => {
  for (const mode of ['missing', 'ambiguous', 'players', 'events', 'build', 'zero']) {
    const strategy = structuredClone(taxonomy.strategyArchetypes.find(s => s.name === REVIEWED_ARCHETYPE_CORES[0].name)!);
    const original = strategy.reviewedArchetypeEvidence!.originalName;
    const ids = taxonomy.clusters.filter(c => strategy.buildIds.includes(c.id)).flatMap(c => c.deckIds);
    const changed = new Map(cards);
    if (mode === 'missing') changed.delete(ids[0]);
    if (mode === 'ambiguous' || mode === 'zero') for (const id of ids) {
      const counts = new Map(changed.get(id));
      for (const identity of REVIEWED_ARCHETYPE_CORES.filter(c => c.champion === 'Lorraine')) for (const name of identity.core) counts.set(name, mode === 'zero' ? 0 : 1);
      changed.set(id, counts);
    }
    if (mode === 'players') strategy.playerCount = 4;
    if (mode === 'events') strategy.eventCount = 1;
    if (mode === 'build') strategy.buildIds.push('missing-build');
    applyReviewedArchetypeEvidence([strategy], taxonomy.clusters, changed);
    assert.equal(strategy.name, original, mode);
    assert.equal(strategy.identityCards, undefined, mode);
    assert.equal(strategy.reviewedArchetypeEvidence, undefined, mode);
  }
});
