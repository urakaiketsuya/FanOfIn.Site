import test from 'node:test';
import assert from 'node:assert/strict';
import { archetypeReport, reportDistribution, type Card, type DeckCardIndexData } from '@gatcg/shared';
const card = (name: string, type: string, cost: number, effect = '') => ({ name, types: [type], elements: ['WIND'], cost_reserve: cost, effect }) as Card;
const catalog = new Map([['Core', card('Core', 'ALLY', 2)], ['Flex', card('Flex', 'ACTION', 3, '**Floating Memory**')], ['Filler', card('Filler', 'ACTION', 1)], ['Spirit', card('Spirit', 'CHAMPION', 0)]]);
const a: DeckCardIndexData = { generatedAt: '', cardNames: ['Core', 'Flex', 'Filler', 'Spirit', 'Side'], decks: [
  { deckId: '1:1', main: [[0, 1], [0, 1], [1, 4], [2, 54]], material: [[3, 1]], sideboard: [[4, 4]] },
  { deckId: '1:2', main: [[0, 4], [2, 76]], material: [[3, 1]], sideboard: [] },
  { deckId: 'outside', main: [[0, 50]], material: [], sideboard: [] },
] };
test('report scopes and deduplicates sightings, keeps section and conditional-copy denominators', () => {
  const report = archetypeReport(['1:1', '1:2', 'missing', '1:1'], [a, a], catalog);
  assert.equal(report.requested, 3); assert.equal(report.listed, 2);
  assert.equal(report.mainSize.mean, 70);
  const flex = report.cards.find(c => c.name === 'Flex')!;
  assert.equal(flex.inclusion, .5); assert.equal(flex.copies.mean, 4);
  assert.equal(report.cards.find(c => c.name === 'Core')!.copies.mean, 3);
  assert.ok(!report.cards.some(c => c.name === 'Side'));
  assert.equal(report.cards.find(c => c.name === 'Spirit')!.access.length, 0);
  assert.equal(report.composition.find(c => c.label === 'Printed Floating Memory')!.mean, 2);
});
test('access summarizes per-list probabilities using actual sizes and absent-card zeros', () => {
  const report = archetypeReport(['1:1', '1:2'], [a], catalog);
  const core = report.cards.find(c => c.name === 'Core')!;
  const p = (size: number, copies: number, seen: number) => {
    let miss = 1; for (let i = 0; i < seen; i++) miss *= (size - copies - i) / (size - i); return 1 - miss;
  };
  assert.ok(Math.abs(core.access[0].mean - (p(60, 2, 7) + p(80, 4, 7)) / 2) < 1e-10);
  assert.ok(Math.abs(report.cards.find(c => c.name === 'Flex')!.access[0].mean - p(60, 4, 7) / 2) < 1e-10);
  assert.deepEqual(core.access.map(p => p.seen), [7, 10, 15, 20]);
});
test('quartiles and missing catalog coverage never turn unknown composition into zeros', () => {
  assert.deepEqual(reportDistribution([0, 10, 20, 30]), { count: 4, mean: 15, median: 15, low: 7.5, high: 22.5 });
  const report = archetypeReport(['1:1', '1:2'], [a], new Map());
  assert.equal(report.complete, 0); assert.deepEqual(report.composition, []);
  assert.equal(report.cards.length, 4); assert.equal(report.mainSize.mean, 70);
  assert.equal(archetypeReport([], [a], catalog).listed, 0);
});

// Baseline fixture for Release A: changing to construction weighting must be explicit.
test('legacy archetype report weights separate sightings of an identical construction', () => {
  const repeated: DeckCardIndexData = { ...a, decks: [...a.decks,
    { ...a.decks[0], deckId: '2:1', sideboard: [[4, 9]] },
  ] };
  const report = archetypeReport(['1:1', '1:2', '2:1'], [repeated], catalog);
  assert.equal(report.listed, 3);
  assert.deepEqual(report.mainSize, { count: 3, mean: 200 / 3, median: 60, low: 60, high: 70 });
  assert.equal(report.cards.find(row => row.name === 'Flex')!.inclusion, 2 / 3);
  assert.equal(report.composition.find(row => row.label === 'Printed Floating Memory')!.mean, 8 / 3);
  assert.deepEqual(report.cards.map(row => [row.section, row.name]), [
    ['main', 'Core'], ['main', 'Filler'], ['material', 'Spirit'], ['main', 'Flex'],
  ]);
});
