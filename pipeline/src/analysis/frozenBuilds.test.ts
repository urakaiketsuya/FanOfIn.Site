import assert from 'node:assert/strict';
import test from 'node:test';
import { exactBuildKey, freezeExactBuilds } from './frozenBuilds.js';
import type { DeckSignature } from './decklists.js';
import type { AnalysisContext } from './context.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

const deck = (name = 'A'): DeckSignature => ({ player: 1, championName: 'C', mainCards: [{ name, quantity: 2 }], materialCards: [{ name: 'C', quantity: 1 }], sideboardCards: [], cardCount: 3, classes: [], elements: [], spiritName: null, spiritElement: null, unmatchedCardNames: [] });
test('exact identity aggregates copies, preserves sections, and ignores sideboards', () => {
  const a = deck();
  const b = { ...a, mainCards: [{ name: 'A', quantity: 1 }, { name: 'A', quantity: 1 }], sideboardCards: [{ name: 'X', quantity: 4 }] };
  assert.equal(exactBuildKey(a), exactBuildKey(b));
  assert.notEqual(exactBuildKey(a), exactBuildKey({ ...a, mainCards: a.materialCards, materialCards: a.mainCards }));
  assert.notEqual(exactBuildKey(a), exactBuildKey(deck('B')));
});
test('later unknown lists never change frozen definitions or acquire membership', () => {
  const events = [1, 2, 3].map(id => ({ id }) as OmnidexEventBundle);
  const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: event => new Map([[1, deck(event.id === 2 ? 'B' : 'A')]]) };
  const frozen = freezeExactBuilds([events[0]], ctx);
  const before = JSON.stringify(frozen.definitions);
  assert.deepEqual(frozen.assign(events), [{ id: 'exact-1', deckIds: ['1:1', '3:1'] }]);
  assert.equal(JSON.stringify(frozen.definitions), before);
  assert.deepEqual(frozen.assign([events[1]]), [{ id: 'exact-1', deckIds: [] }]);
});
