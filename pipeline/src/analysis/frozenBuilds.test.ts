import assert from 'node:assert/strict';
import test from 'node:test';
import { exactBuildKey, freezeExactBuilds, freezeSimilarBuilds } from './frozenBuilds.js';
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

test('similar groups assign later variants without learning from them or crossing material sections', () => {
  const events = [1, 2, 3, 4].map(id => ({ id }) as OmnidexEventBundle);
  const original = { ...deck(), mainCards: [{ name: 'A', quantity: 4 }, { name: 'B', quantity: 4 }] };
  const variant = { ...original, mainCards: [{ name: 'A', quantity: 4 }, { name: 'B', quantity: 3 }, { name: 'X', quantity: 1 }] };
  const signatures = [original, variant, { ...variant, materialCards: [{ name: 'Different', quantity: 1 }] }, deck('Unknown')];
  const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: event => new Map([[1, signatures[event.id - 1]]]) };
  const frozen = freezeSimilarBuilds([events[0]], ctx);
  const before = JSON.stringify(frozen.definitions);
  assert.deepEqual(frozen.assign(events), [{ id: 'exact-1', deckIds: ['1:1', '2:1'] }]);
  assert.equal(JSON.stringify(frozen.definitions), before);
  assert.deepEqual(frozen.assign([events[3], events[1]]), [{ id: 'exact-1', deckIds: ['2:1'] }]);
  assert.throws(() => freezeSimilarBuilds([], ctx, NaN));
  assert.throws(() => freezeSimilarBuilds([], ctx, 0));
});

test('training order does not change seeds or nearest-seed memberships', () => {
  const events = [1, 2, 3].map(id => ({ id }) as OmnidexEventBundle);
  const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: event => new Map([[1, deck(event.id === 3 ? 'B' : 'A')]]) };
  const a = freezeSimilarBuilds(events, ctx);
  const b = freezeSimilarBuilds([...events].reverse(), ctx);
  assert.deepEqual(a.definitions, b.definitions);
  assert.deepEqual(a.assign(events), b.assign(events));
});

test('assignment includes the similarity boundary and chooses the closest fixed seed', () => {
  const events = [1, 2, 3].map(id => ({ id }) as OmnidexEventBundle);
  const make = (cards: Array<[string, number]>) => ({ ...deck(), mainCards: cards.map(([name, quantity]) => ({ name, quantity })) });
  const lists = [make([['Core', 7], ['X', 1]]), make([['Core', 7], ['Y', 2]]), make([['Core', 7], ['Y', 3]])];
  const ctx: AnalysisContext = { cardIndex: new Map(), getEventSignatures: event => new Map([[1, lists[event.id - 1]]]) };
  const boundary = freezeSimilarBuilds([events[0]], ctx, 0.7);
  assert.equal(boundary.assign([events[1]])[0].deckIds.length, 1);
  assert.equal(boundary.assign([events[2]])[0].deckIds.length, 0);
  const both = freezeSimilarBuilds([events[0], events[2]], ctx, 0.7);
  assert.equal(both.definitions.length, 2);
  const closest = both.assign([events[1]]).find(build => build.deckIds.length)!;
  const definition = both.definitions.find(build => build.id === closest.id)!;
  assert.equal(definition.key, exactBuildKey(lists[2]));
});
