import { writeFile } from 'node:fs/promises';
import { fitComposition, scoreComposition, type CompositionMatch } from './cardCompositionValidation.js';
import { historicalPredictions, type HistoricalMatch } from './opponentValidation.js';
import { fitConfidenceScale, calibrate, errorBreakdowns } from './cardCalibrationValidation.js';

export async function runCalibrationAudit({ root, train, test, history, cutoff, inputs }: {
    root: string; train: CompositionMatch[]; test: CompositionMatch[]; history: HistoricalMatch[];
    cutoff: string; inputs: Record<string, string>;
}) {
    const dates = [...new Set(train.map(r => r.date))].sort();
    if (dates.length < 5) throw new Error('Insufficient dates for temporal calibration');
    const calibrationStart = dates[Math.floor(dates.length * .8)];
    // Recompute Elo at the INNER cutoff; validation outcomes cannot enter its priors.
    const innerPriors = historicalPredictions(history, calibrationStart);
    const innerRows = train.map(r => ({ ...r, prior: innerPriors.get(r.id)!.withOpponent }));
    const fitting = innerRows.filter(r => r.date < calibrationStart);
    const calibration = innerRows.filter(r => r.date >= calibrationStart);
    if (!fitting.length || !calibration.length || !test.length) throw new Error('Empty temporal partition');
    const options = { minimumPairMatches: 100, minimumPairEvents: 20, maximumPairs: 0, penalty: 100, passes: 2000 };
    console.log(`Calibration: fit ${fitting.length}, calibrate ${calibration.length}, test ${test.length}; inner cutoff ${calibrationStart}`);
    const inner = fitComposition(fitting, options);
    if (!inner.diagnostics.cards.converged || !inner.diagnostics.adjustedContext.converged) throw new Error('Inner fit failed convergence');
    const scale = fitConfidenceScale(calibration.map(r => ({ predicted: inner.models.cards(r), observed: r.score })));
    console.log(`Frozen confidence scale ${scale}; refitting original training cohort`);
    const final = fitComposition(train, options);
    if (!final.diagnostics.cards.converged || !final.diagnostics.adjustedContext.converged) throw new Error('Final fit failed convergence');
    const models = { adjustedContext: final.models.adjustedContext, cards: final.models.cards,
        calibratedCards: (r: CompositionMatch) => calibrate(final.models.cards(r), scale) };
    const identities = new Set(train.flatMap(r => [r.a.identity, r.b.identity]));
    const report = {
        schemaVersion: 1, generatedAt: new Date().toISOString(), publication: { enabled: false, status: 'research-only' },
        inputs: { ...inputs, cutoff, calibrationStart, trainingMatches: train.length, innerTrainingMatches: fitting.length, calibrationMatches: calibration.length,
            lastTestDate: test.at(-1)?.date },
        method: {
            calibration: 'First 80% distinct dates of original training fit the inner model; remaining training dates fit one bounded confidence scale minimizing squared match-point error. Elo freezes at each respective cutoff. No holdout outcomes fit the scale.',
            formula: 'p_calibrated = 0.5 + scale * (p - 0.5); scale = clamp(sum((p-0.5)*(y-0.5))/sum((p-0.5)^2), 0, 1). No intercept preserves side-swap symmetry.',
            refit: 'Apply the frozen scale to a model refitted on all original training rows. Calibration transfer is evaluated, not assumed; also report the fully frozen inner model on test.',
            target: 'Match point share: win 1, draw 0.5, loss 0.',
            breakdown: 'Champion and familiarity use both player perspectives, with unique match counts and event-cluster intervals. Matchup is format plus lexically sorted champions, from first champion perspective; mirrors retain original outcome-independent orientation.',
            familiarity: 'Relative to all original training decks: exact main/material identity; new list with all card names seen; or new list with up to/over 10% copies of unseen names. Main+material, no sideboard. Does not measure nearest-family similarity.',
            uncertainty: '400 paired event-cluster bootstrap samples; intervals omitted below 20 events; sufficientSupport requires 100 appearances and 20 events. Subgroups exploratory, no multiplicity correction; no cross-event player clustering.',
            limitations: ['Previously inspected retrospective holdout, not untouched future validation.', 'Single temporal calibration split; refitted model may have different confidence distribution.', 'Current catalog and no historical ban-era reconstruction.', 'Published-deck selection bias and recurring players; no causal card effect.', 'No public win-rate estimate enabled.'],
        }, scale, diagnostics: { inner: inner.diagnostics, final: final.diagnostics },
        holdout: scoreComposition(test, models),
        bothDecksUnseen: scoreComposition(test.filter(r => !identities.has(r.a.identity) && !identities.has(r.b.identity)), models),
        temporalHalves: [test.slice(0, Math.floor(test.length / 2)), test.slice(Math.floor(test.length / 2))].map(rows => ({ firstDate: rows[0]?.date, lastDate: rows.at(-1)?.date, ...scoreComposition(rows, models) })),
        frozenInnerHoldout: scoreComposition(test.map(r => ({ ...r, prior: innerPriors.get(r.id)!.withOpponent })), {
            adjustedContext: inner.models.adjustedContext, cards: inner.models.cards,
            calibratedCards: r => calibrate(inner.models.cards(r), scale),
        }),
        errors: errorBreakdowns(train, test, final.models.cards, scale),
    };
    await writeFile(`${root}data/analysis/card-calibration-audit.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ scale, holdout: report.holdout, familiarity: report.errors.familiarity }, null, 2));
}
