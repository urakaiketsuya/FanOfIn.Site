import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitComposition, scoreComposition, type CompositionMatch, type CompositionDeck } from './cardCompositionValidation.js';
const deck = (names: string[]): CompositionDeck => ({ identity: names.join('|'), champion: 'Test', cards: names.map(n => [n, 4]) });
const options = { minimumPairMatches: 2, minimumPairEvents: 2, maximumPairs: 100, penalty: 1, passes: 200 };
const row = (id: number, a: CompositionDeck, b: CompositionDeck, score: number): CompositionMatch => ({ id: String(id), event: String(id), date: '2025-01-01', format: 'standard', prior: .5, a, b, score });
test('pair model learns an interaction beyond individual cards on fresh matches', () => {
    const neutral = deck(['neutral']);
    const train = Array.from({ length: 200 }, (_, i) => { const names = [[], ['A'], ['B'], ['A', 'B']][i % 4]; return row(i, deck(['base', ...names]), neutral, names.length === 1 ? 0 : 1); });
    const fitted = fitComposition(train, options);
    const testRows = train.map((r, i) => ({ ...r, id: `test-${i}`, event: `test-${i}` }));
    const scores = scoreComposition(testRows, fitted.models).models;
    assert.ok(scores.cardPairs.meanSquaredMatchPointError! < scores.cards.meanSquaredMatchPointError! * .2);
});
test('predictions ignore test outcomes; swapped sides complement; unseen cards stay finite', () => {
    const fitted = fitComposition(Array.from({ length: 30 }, (_, i) => row(i, deck(['A', 'B']), deck(['C']), i % 2)), options);
    const r = row(90, deck(['A', 'B', 'new']), deck(['C']), 1);
    for (const predict of Object.values(fitted.models)) {
        assert.equal(predict(r), predict({ ...r, score: 0 }));
        assert.ok(Math.abs(predict(r) + predict({ ...r, a: r.b, b: r.a, prior: 1 - r.prior }) - 1) < 1e-10);
        assert.ok(Number.isFinite(predict(row(91, deck(['unknown']), deck(['other']), 0))));
    }
});
test('pair support counts each match once and requires multiple events', () => {
    const train = Array.from({ length: 20 }, (_, i) => ({ ...row(i, deck(['A', 'B']), deck(['A', 'B']), .5), event: 'same' }));
    assert.equal(fitComposition(train, options).diagnostics.selectedPairs, 0);
    assert.equal(fitComposition(train.map((r, i) => ({ ...r, event: String(i) })), { ...options, minimumPairMatches: 21 }).diagnostics.selectedPairs, 0);
});

test('ridge card predictions match a closed-form two-column solution', () => {
    const train = Array.from({ length: 20 }, (_, i) => row(i, deck(['A']), deck(['B']), 1));
    const fitted = fitComposition(train, { ...options, passes: 2000 });
    assert.ok(fitted.diagnostics.cards.converged);
    assert.ok(Math.abs(fitted.models.cards(train[0]) - (.5 + 20 / 41)) < 1e-5);
});

test('context distinguishes champion matchups within recorded format', () => {
    const a = { ...deck(['A']), champion: 'Alice' };
    const b = { ...deck(['B']), champion: 'Bob' };
    const train = Array.from({ length: 40 }, (_, i) => row(i, a, b, 1));
    const fitted = fitComposition(train, { ...options, passes: 2000 });
    assert.ok(fitted.models.adjustedContext(train[0]) > .9);
    assert.equal(fitted.models.adjustedContext({ ...train[0], format: 'unseen-format' }), .5);
});
