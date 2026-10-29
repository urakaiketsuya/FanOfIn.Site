import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComparisonState, readBuildComparisonState } from '../src/features/decks/buildComparisonHandoff';

const deck = { main: [{ card: 'A', quantity: 4 }], material: [{ card: 'Champion', quantity: 1 }], sideboard: [{ card: 'Side', quantity: 2 }] };
test('handoff snapshots Main and Material and survives history serialization', () => {
  const state = buildComparisonState('build', 'Champion', deck);
  const restored = readBuildComparisonState(JSON.parse(JSON.stringify(state)), 'build');
  assert.deepEqual(restored, { buildId: 'build', championName: 'Champion', decklist: { main: deck.main, material: deck.material } });
  assert.notEqual(state.buildComparison.decklist.main, deck.main);
  assert.notEqual(state.buildComparison.decklist.main[0], deck.main[0]);
  assert.equal('sideboard' in state.buildComparison.decklist, false);
});
test('unrelated builds and malformed history cannot establish comparison context', () => {
  const state = buildComparisonState('build', 'Champion', deck);
  assert.equal(readBuildComparisonState(state, 'other'), null);
  for (const value of [null, {}, { buildComparison: {} }, { buildComparison: { ...state.buildComparison, championName: '' } }]) {
    assert.equal(readBuildComparisonState(value, 'build'), null);
  }
  for (const main of [[], null, [{ card: 'A', quantity: -1 }], [{ card: '', quantity: 1 }], [{ card: 'A', quantity: 1.5 }]]) {
    assert.equal(readBuildComparisonState({ buildComparison: { ...state.buildComparison, decklist: { main, material: deck.material } } }, 'build'), null);
  }
});
