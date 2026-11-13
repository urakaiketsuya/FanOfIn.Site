import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitComposition, scoreComposition, type CompositionDeck, type CompositionMatch } from './cardCompositionValidation.js';
import { discoverGroups, groupExtension, type GroupOptions } from './cardGroupValidation.js';
const deck = (cards: string[]): CompositionDeck => ({ identity: [...cards].sort().join('|'), champion: 'Test', cards: cards.map(n => [n, 4]) });
const row = (i: number, a: CompositionDeck, b = deck(['Neutral'])): CompositionMatch => ({ id: String(i), event: `event-${i}`, playerA: `a-${i}`, playerB: `b-${i}`, date: '2025-01-01', format: 'standard', prior: .5, score: 1, a, b });
const options: GroupOptions = { minimumMatches: 2, minimumEvents: 2, minimumPlayers: 2, maximumSingles: 20, beamWidth: 100, maximumPerSize: 100 };

test('group mining counts matches once, enforces players/events, and ignores outcomes', () => {
  const d = deck(['A', 'B', 'C', 'D', 'E']);
  const rows = Array.from({ length: 4 }, (_, i) => row(i, d, d));
  const found = discoverGroups(rows, [], options);
  assert.deepEqual([...new Set(found.recurring.map(g => g.cards.length))], [3, 4, 5]);
  assert.ok(found.recurring.every(g => g.matches === 4 && g.events === 4 && g.players === 8));
  assert.deepEqual(discoverGroups(rows.map(r => ({ ...r, score: 0 })), [], options), found);
  assert.equal(discoverGroups(rows, [], { ...options, minimumMatches: 5 }).recurring.length, 0);
  assert.equal(discoverGroups(rows.map(r => ({ ...r, event: 'same' })), [], options).recurring.length, 0);
  assert.equal(discoverGroups(rows.map(r => ({ ...r, playerA: 'same', playerB: 'same' })), [], options).recurring.length, 0);
});

test('package candidates preserve exact sets, deduplicate names, and encode partial states', () => {
  const rows = Array.from({ length: 4 }, (_, i) => row(i, deck(['A', 'B', 'C', 'D'])));
  const found = discoverGroups(rows, [['A', 'B', 'C'], ['C', 'A', 'B', 'A'], ['A', 'B', 'D'], ['A', 'B', 'unknown']], options);
  assert.equal(found.packages.length, 2);
  assert.ok(found.packages.every(g => g.cards.length === 3));
  const model = groupExtension('packages', found.packages, true);
  assert.deepEqual([...model.features(deck(['A', 'B'])).values()], [1, 1]);
  assert.ok([...model.features(deck(['A', 'B'])).keys()].every(k => k.startsWith('partial:2:')));
  assert.ok([...model.features(deck(['A', 'B', 'C'])).keys()].some(k => k.startsWith('full:')));
  assert.equal(model.features(deck(['unknown'])).size, 0);
});

test('triples add signal beyond cards, preserve symmetry, and ignore held-out outcomes', () => {
  const train = Array.from({ length: 320 }, (_, i) => {
    const cards = ['A', 'B', 'C'].filter((_, bit) => (i % 8) & (1 << bit));
    return { ...row(i, deck(['Base', ...cards])), score: cards.length === 3 ? 1 : .5 };
  });
  const found = discoverGroups(train, [], options);
  const fitted = fitComposition(train, { minimumPairMatches: 2, minimumPairEvents: 2, maximumPairs: 0, penalty: .1, passes: 2000 }, [groupExtension('groups', found.recurring)]);
  assert.ok(fitted.diagnostics.extensions.groups.converged);
  const scores = scoreComposition(train, fitted.models).models;
  assert.ok(scores.groups.meanSquaredMatchPointError! < scores.cards.meanSquaredMatchPointError! * .1);
  const predict = fitted.models.groups;
  const r = { ...train[7], a: deck(['Base', 'A', 'B', 'C', 'unseen']) };
  assert.equal(predict(r), predict({ ...r, score: 0 }));
  assert.ok(Math.abs(predict(r) + predict({ ...r, a: r.b, b: r.a, prior: 1 - r.prior }) - 1) < 1e-10);
});
