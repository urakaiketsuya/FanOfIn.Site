import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReviewedRelationships, REVIEWED_RELATIONSHIPS } from '@gatcg/shared';
const cards = (names: readonly string[]) => new Map(names.map(n => [n, 1]));
const fractals = REVIEWED_RELATIONSHIPS[0].variants[0].cards;
const preparation = REVIEWED_RELATIONSHIPS[1].variants[0].cards;
const run = (decks: { deckId: string; player: number; eventId: number; cardCounts: Map<string, number> }[], ids = decks.map(d => d.deckId)) => evaluateReviewedRelationships(
  [{ id: 'family', championName: 'Test', buildIds: ['build'] }], [{ id: 'build', deckIds: ids }], decks);
const population = () => Array.from({ length: 10 }, (_, i) => ({ deckId: `deck${i}`, player: i, eventId: i % 2, cardCounts: cards([...fractals, ...preparation]) }));
test('overlapping cores preserve inputs and deduplicate sightings', () => {
  const decks = population(); const before = structuredClone(decks);
  const result = run(decks, [...decks.map(d => d.deckId), 'deck0']);
  assert.equal(result[0].families[0].evidence.supported, true);
  assert.equal(result[1].families[0].evidence.supported, true);
  assert.equal(result[0].families[0].evidence.deckCount, 10);
  assert.deepEqual(decks, before);
});
test('requires joint positive presence, complete index and independent supporting players', () => {
  const decks = population();
  decks[0].cardCounts.set(fractals[0], 0);
  assert.equal(run(decks)[0].families[0].evidence.supported, true);
  assert.deepEqual(run(decks)[0].families[0].evidence.exceptionDeckIds, ['deck0']);
  decks[1].cardCounts.delete(fractals[1]);
  assert.equal(run(decks)[0].families[0].evidence.supported, false);
  assert.equal(run(population(), [...decks.map(d => d.deckId), 'missing'])[0].families[0].evidence.supported, false);
  assert.equal(run(population().map(d => ({ ...d, player: 1 })))[0].families[0].evidence.supported, false);
});
test('Suited alternatives count each deck once and retain variant evidence', () => {
  const variants = REVIEWED_RELATIONSHIPS[3].variants;
  const decks = population().map((d, i) => ({ ...d, cardCounts: cards(variants[i % 2].cards) }));
  const family = run(decks)[3].families[0];
  assert.equal(family.evidence.matchingDeckCount, 10);
  assert.equal(family.evidence.supported, true);
  assert.deepEqual(family.variants.map(v => v.evidence.matchingDeckCount), [5, 5]);
  assert.ok(family.variants.every(v => !v.evidence.supported));
});
test('family support does not imply support for every build', () => {
  const decks = population(); decks[0].cardCounts.clear();
  const result = evaluateReviewedRelationships([{ id: 'f', championName: 'Test', buildIds: ['a', 'b'] }], [
    { id: 'a', deckIds: decks.slice(1).map(d => d.deckId) }, { id: 'b', deckIds: ['deck0'] },
  ], decks)[0].families[0];
  assert.ok(result.evidence.supported);
  assert.equal(result.builds[1].evidence.supported, false);
});
