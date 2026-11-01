import assert from 'node:assert/strict';
import test from 'node:test';
import type { Card } from '@gatcg/shared';
import { championsForDeck } from '../src/features/timelines/champions';

const cards = ['Merlin, Brilliant Vestige', 'Alice, Whim\'s Monarch', 'Merlin, Memorite Vassal', 'Diao Chan, Enchantress'].map(name => ({ name, types: ['CHAMPION'], subtypes: [] }) as Card);

test('mixed champion decks retain both identities in description order without duplicate levels', () => {
  assert.deepEqual(championsForDeck('Fire Spectre Alice / Merlin', cards).map(card => card.name), ["Alice, Whim's Monarch", 'Merlin, Brilliant Vestige']);
});
test('multiword names match and unknown decks retain their fallback', () => {
  assert.equal(championsForDeck('Water Diao Chan', cards)[0]?.name, 'Diao Chan, Enchantress');
  assert.deepEqual(championsForDeck('Wind Allies', cards), []);
  assert.deepEqual(championsForDeck('Merlin', []), []);
  assert.deepEqual(championsForDeck('Merlina', cards), []);
});

test('spirit portraits do not become named champion matches or filters', () => {
  const spirit = {name:'Spirit of Wind',types:['CHAMPION'],subtypes:['SPIRIT']} as Card;
  assert.deepEqual(championsForDeck('Spirit of Wind', [spirit]), []);
  assert.deepEqual(championsForDeck('Alice / Spirit of Wind', [...cards, spirit]).map(c=>c.name), ["Alice, Whim's Monarch"]);
});
