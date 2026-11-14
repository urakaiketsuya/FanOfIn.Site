import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitConfidenceScale, calibrate, familiarityClassifier, errorBreakdowns, summarizeErrors } from './cardCalibrationValidation.js';
import type { CompositionDeck, CompositionMatch } from './cardCompositionValidation.js';
const deck = (identity: string, champion: string, cards: [string, number][] = [['Known', 4]]): CompositionDeck => ({ identity, champion, cards });
const row = (a = deck('a', 'A'), b = deck('b', 'B')): CompositionMatch => ({ id: '1', event: '1', date: '2025-01-01', format: 'standard', score: 1, prior: .5, a, b });
test('confidence fit recovers known shrinkage, preserves ties, ordering and side symmetry', () => {
    const scale = fitConfidenceScale([.1, .3, .5, .7, .9].map(predicted => ({ predicted, observed: .5 + .6 * (predicted - .5) })));
    assert.ok(Math.abs(scale - .6) < 1e-12);
    assert.equal(calibrate(.5, scale), .5);
    assert.ok(calibrate(.7, scale) > calibrate(.3, scale));
    for (const p of [0, .1, .5, .8, 1]) assert.ok(Math.abs(calibrate(p, scale) + calibrate(1 - p, scale) - 1) < 1e-12);
});
test('confidence fitting handles no signal, reversed signal, invalid data and refuses sharpening', () => {
    assert.equal(fitConfidenceScale([{ predicted: .5, observed: 1 }]), 1);
    assert.equal(fitConfidenceScale([{ predicted: .8, observed: 0 }]), 0);
    assert.equal(fitConfidenceScale([{ predicted: .8, observed: 1 }]), 1);
    assert.throws(() => fitConfidenceScale([]));
    assert.throws(() => fitConfidenceScale([{ predicted: NaN, observed: 1 }]));
});
test('familiarity uses training only, preserves exact-list status and counts unseen copies', () => {
    const classify = familiarityClassifier([row()]);
    assert.equal(classify(deck('a', 'A')), 'Exact list seen');
    assert.equal(classify(deck('c', 'A')), 'New list, all cards seen');
    assert.equal(classify(deck('d', 'A', [['Known', 9], ['New', 1]])), 'New list, up to 10% unseen copies');
    assert.equal(classify(deck('e', 'A', [['Known', 8], ['New', 2]])), 'New list, over 10% unseen copies');
    assert.equal(classify(deck('f', 'A', [])), 'No cards');
});
test('breakdowns use correct player orientation, canonical matchups and unique mirror counts', () => {
    const r = row(deck('b', 'B'), deck('a', 'A'));
    const result = errorBreakdowns([row()], [r], () => .8, .5);
    const a = result.champion.find(g => g.key === 'A')!;
    assert.ok(Math.abs(a.predicted! - .2) < 1e-12);
    assert.equal(a.observed, 0);
    assert.ok(Math.abs(a.calibrated! - .35) < 1e-12);
    assert.equal(result.matchup[0].key, '["standard","A","B"]');
    assert.equal(result.matchup[0].observed, 0);
    const mirror = errorBreakdowns([row()], [row(deck('a', 'A'), deck('c', 'A'))], () => .8, .5);
    assert.equal(mirror.champion[0].appearances, 2);
    assert.equal(mirror.champion[0].matches, 1);
    assert.equal(mirror.champion[0].calibratedBias, 0);
    assert.equal(mirror.matchup[0].appearances, 1);
});
test('event bootstrap is deterministic, measures paired gain and omits sparse uncertainty', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: String(i), event: String(i), predicted: .9, calibrated: .7, observed: .5 }));
    const report = summarizeErrors(rows);
    assert.deepEqual(report, summarizeErrors(rows));
    for (const v of report.improvement95!) assert.ok(Math.abs(v - .12) < 1e-12);
    assert.equal(summarizeErrors(rows.slice(1)).improvement95, null);
    assert.equal(report.sufficientSupport, false);
    assert.equal(summarizeErrors([]).rawError, null);
});

test('temporal calibration priors cannot learn from calibration or test outcomes', async () => {
    const { historicalPredictions } = await import('./opponentValidation.js');
    const history = Array.from({ length: 6 }, (_, i) => ({ id: String(i), event: String(i), date: `2025-01-0${i + 1}`, a: '1', b: '2', score: 1 }));
    const cutoff = '2025-01-04';
    const original = historicalPredictions(history, cutoff);
    const changed = historicalPredictions(history.map(r => r.date >= cutoff ? { ...r, score: 0 } : r), cutoff);
    assert.deepEqual(original, changed);
    assert.equal(original.get('3')!.withOpponent, original.get('5')!.withOpponent);
});
