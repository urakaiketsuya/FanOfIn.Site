import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckMatchesSearch, searchableDeckCards } from '@gatcg/shared';

test('champion family, exact included cards, and every-card semantics combine', () => {
  const filter = { champion: 'Guo Jia', cards: ['A', 'B'] };
  assert.equal(deckMatchesSearch('guo-jia', ['A', 'B'], filter), true);
  assert.equal(deckMatchesSearch("Guo Jia, Heaven’s Favored", ['A', 'B'], filter), true);
  assert.equal(deckMatchesSearch('Silvie', ['A', 'B'], filter), false);
  assert.equal(deckMatchesSearch('Guo Jia', ['A'], filter), false);
  assert.equal(deckMatchesSearch('Guo Jia', ['A', 'B alternate'], filter), false);
  assert.equal(deckMatchesSearch(null, ['A', 'B'], filter), false);
});

test('Main and Material membership excludes sideboard, zero copies and deduplicates printings', () => {
  const deck = { main: [{ card: 'A', quantity: 2 }, { card: 'A', quantity: 1 }, { card: 'Zero', quantity: 0 }], material: [{ card: 'Champion', quantity: 1 }], sideboard: [{ card: 'B', quantity: 4 }] };
  assert.deepEqual(searchableDeckCards(deck), ['A', 'Champion']);
  assert.equal(deckMatchesSearch(null, searchableDeckCards(deck), { champion: '', cards: ['B'] }), false);
});

test('unknown lists never match requirements or exclusions; existing exclusions remain supported', () => {
  assert.equal(deckMatchesSearch(null, undefined, { champion: '', cards: [] }), true);
  assert.equal(deckMatchesSearch(null, undefined, { champion: '', cards: ['-A'] }), false);
  assert.equal(deckMatchesSearch(null, ['B'], { champion: '', cards: ['B', '-A'] }), true);
  assert.equal(deckMatchesSearch(null, ['A', 'B'], { champion: '', cards: ['B', '-A'] }), false);
});
