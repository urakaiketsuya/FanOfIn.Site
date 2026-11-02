import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { Card } from '@gatcg/shared';
import { computeScavengeForecasts } from '../src/lib/keywordForecast';
import { withSpoilerCards } from '../src/lib/spoilerCatalog';
const catalog = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
const cards = new Map(withSpoilerCards(catalog).map(card => [card.name, card]));
const line = (name: string, quantity: number) => ({ name, quantity });

test('Song Scavenge uses only Main targets and accepts plain spoiler text', () => {
  const main = [line('Gusty Fan', 1), line('Opening Refrain', 9)];
  const [result] = computeScavengeForecasts(main, cards, [line('Aiss Yustera', 1)]);
  assert.equal(result.cardName, 'Aiss Yustera');
  assert.equal(result.deckSize, 10);
  assert.equal(result.matchingCopies, 1);
  assert.ok(Math.abs(result.hitChance - 0.7) < 1e-12);
  assert.deepEqual(computeScavengeForecasts(main, cards), []);
});

test('a resolving Main source removes one copy, retaining other eligible copies', () => {
  const [result] = computeScavengeForecasts([line('Bandit, Gaze Leader', 2), line('Opening Refrain', 8)], cards);
  assert.equal(result.deckSize, 9);
  assert.equal(result.matchingCopies, 1);
  assert.ok(Math.abs(result.hitChance - 6 / 9) < 1e-12);
  const [single] = computeScavengeForecasts([line('Bandit, Gaze Leader', 1)], cards);
  assert.equal(single.hitChance, 0);
});

test('bold and plain rules match; variable amounts and Forese qualifiers stay excluded', () => {
  const source = cards.get('Bandit, Gaze Leader')!;
  const main = [line(source.name, 4), line('Opening Refrain', 56)];
  const plain = new Map(cards).set(source.name, { ...source, effect: source.effect.replaceAll('**', '') });
  assert.deepEqual(computeScavengeForecasts(main, plain), computeScavengeForecasts(main, cards));
  const variable = new Map(cards).set(source.name, { ...source, effect: 'Scavenge 2+X for a Raccoon ally card.' });
  assert.deepEqual(computeScavengeForecasts(main, variable), []);
  assert.deepEqual(computeScavengeForecasts([line('Forese, Fervid Cantor', 4)], cards), []);
  assert.deepEqual(computeScavengeForecasts([], cards, [line('Aiss Yustera', 0)]), []);
});
