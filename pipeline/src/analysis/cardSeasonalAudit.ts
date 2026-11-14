import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fitComposition, scoreComposition, type CompositionMatch } from './cardCompositionValidation.js';
import { historicalPredictions, type HistoricalMatch } from './opponentValidation.js';
import { fitConfidenceScale, calibrate, errorBreakdowns } from './cardCalibrationValidation.js';
import { playerAdjustedReport } from './playerAdjustedValidation.js';
import { seasonalPredictions } from './cardSeasonalValidation.js';
import type { BanRegime } from '../../../shared/src/competitivePeriods.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

export async function runSeasonalAudit({ root, train, test, history, cutoff, bundles, inputs, playerAdjusted = false }: {
    playerAdjusted?: boolean;
    root: string; train: CompositionMatch[]; test: CompositionMatch[]; history: HistoricalMatch[];
    cutoff: string; bundles: OmnidexEventBundle[]; inputs: Record<string, string>;
}) {
    const manifest = JSON.parse(await readFile(`${root}data/analysis/experiment-baselines.json`, 'utf8')) as { artifacts: { path: string; sha256: string }[] };
    const verify = async () => { for (const a of manifest.artifacts) if (createHash('sha256').update(await readFile(root + a.path)).digest('hex') !== a.sha256) throw new Error(`Preserved experiment changed: ${a.path}`); };
    const seasonalPath = `${root}data/analysis/card-seasonal-audit.json`;
    const preservedSeasonal = playerAdjusted ? await readFile(seasonalPath, 'utf8') : null;
    await verify();
    const ledgerText = await readFile(`${root}data/analysis/competitive-ban-regimes.json`, 'utf8');
    const ledger = JSON.parse(ledgerText) as { regimes: BanRegime[] };
    const contexts = new Map(bundles.map(b => [String(b.id), { season: b.event.season, completed: b.event.dateCompleted }]));
    const contextRows = [...contexts].sort(([a], [b]) => a.localeCompare(b));
    const sourceInputs = { ...inputs, cutoff, ledgerSha256: createHash('sha256').update(ledgerText).digest('hex'), eventContextSha256: createHash('sha256').update(JSON.stringify(contextRows)).digest('hex') };
    if (preservedSeasonal) {
        const previous = JSON.parse(preservedSeasonal) as { inputs: Record<string, string> };
        for (const [key, value] of Object.entries(sourceInputs)) if (previous.inputs[key] !== value) throw new Error(`Seasonal comparison input changed: ${key}`);
    }
    const dates = [...new Set(train.map(r => r.date))].sort();
    const calibrationStart = dates[Math.floor(dates.length * .8)];
    const priors = historicalPredictions(history, calibrationStart);
    const innerTrain = train.filter(r => r.date < calibrationStart).map(r => ({ ...r, prior: priors.get(r.id)!.withOpponent }));
    const validation = train.filter(r => r.date >= calibrationStart).map(r => ({ ...r, prior: priors.get(r.id)!.withOpponent }));
    const options = { minimumPairMatches: 100, minimumPairEvents: 20, maximumPairs: 0, penalty: 100, passes: 2000 };
    console.log(`Seasonal inner fit ${innerTrain.length}; validation ${validation.length}; test ${test.length}`);
    const inner = fitComposition(innerTrain, options);
    if (!inner.diagnostics.cards.converged) throw new Error('Inner fit failed convergence');
    const prepare = (rows: CompositionMatch[], predict: (r: CompositionMatch) => number) => rows.map(r => ({ ...r, base: predict(r), ...(playerAdjusted ? { equalSkillBase: predict({ ...r, prior: .5 }) } : {}), eventContext: contexts.get(r.event) }));
    const validationInput = prepare(validation, inner.models.cards);
    const candidates = [20, 100, 400].map(priorMass => {
        const predictions = seasonalPredictions(validationInput, ledger.regimes, priorMass);
        const fit = (name: 'global' | 'seasonal') => {
            const points = validation.map(r => ({ predicted: predictions.get(r.id)![name], observed: r.score }));
            const scale = fitConfidenceScale(points);
            return { scale, error: points.reduce((sum, p) => sum + (calibrate(p.predicted, scale) - p.observed) ** 2, 0) / points.length };
        };
        return { priorMass, global: fit('global'), seasonal: fit('seasonal') };
    });
    const select = (name: 'global' | 'seasonal') => [...candidates].sort((a, b) => a[name].error - b[name].error || b.priorMass - a.priorMass)[0];
    const globalChoice = select('global'), seasonalChoice = select('seasonal');
    console.log(JSON.stringify({ candidates, globalChoice, seasonalChoice }));
    const final = fitComposition(train, options);
    if (!final.diagnostics.cards.converged) throw new Error('Final fit failed convergence');
    const input = prepare(test, final.models.cards);
    const global = seasonalPredictions(input, ledger.regimes, globalChoice.priorMass);
    const seasonal = seasonalPredictions(input, ledger.regimes, seasonalChoice.priorMass);
    const baseline = JSON.parse(await readFile(`${root}data/analysis/card-calibration-audit.json`, 'utf8')) as { scale: number };
    const models = { cards: final.models.cards, adjustedContext: (r: CompositionMatch) => calibrate(final.models.cards(r), baseline.scale),
        globalAdaptive: (r: CompositionMatch) => calibrate(global.get(r.id)!.global, globalChoice.global.scale),
        seasonal: (r: CompositionMatch) => calibrate(seasonal.get(r.id)!.seasonal, seasonalChoice.seasonal.scale) };
    if (playerAdjusted) {
        const players = new Map(history.map(r => [r.id, [String(r.a), String(r.b)] as const]));
        const report = playerAdjustedReport(test.map(r => ({ ...r,
            playerA: players.get(r.id)![0], playerB: players.get(r.id)![1],
            prediction: models.seasonal(r),
            equalSkill: calibrate(seasonal.get(r.id)!.equalSkill!, seasonalChoice.seasonal.scale),
        })));
        await verify();
        if (await readFile(seasonalPath, 'utf8') !== preservedSeasonal) throw new Error('Preserved seasonal experiment changed');
        const artifact = { schemaVersion: 1, generatedAt: new Date().toISOString(), publication: { enabled: false },
            inputs: { ...sourceInputs, seasonalSha256: createHash('sha256').update(preservedSeasonal!).digest('hex') },
            selected: { global: globalChoice, seasonal: seasonalChoice },
            method: 'Observed minus frozen pre-holdout Elo expectation. Equal-skill predictions replace only the base prior with 0.5 and reuse the actual-history seasonal correction before calibration. Opponents are the observed schedule, not a representative current field. Intervals are 400 event-cluster bootstrap resamples; omitted below 20 events. No causal deck-effect claim.',
            ...report };
        await writeFile(`${root}data/analysis/card-player-adjusted-audit.json`, JSON.stringify(artifact, null, 2) + '\n');
        console.log(JSON.stringify({ overall: report.overall, champions: report.champions }, null, 2));
        return;
    }
    const groups = new Map<string, CompositionMatch[]>();
    for (const r of test) { const p = seasonal.get(r.id)!.period; const key = p.key ?? p.status; const g = groups.get(key) ?? []; g.push(r); groups.set(key, g); }
    const identities = new Set(train.flatMap(r => [r.a.identity, r.b.identity]));
    const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), publication: { enabled: false, status: 'research-only' },
        inputs: { ...inputs, cutoff, calibrationStart, ledgerSha256: createHash('sha256').update(ledgerText).digest('hex'), eventContextSha256: createHash('sha256').update(JSON.stringify(contextRows)).digest('hex') },
        method: {
            target: 'Match-point share, win 1 / draw 0.5 / loss 0.',
            periods: 'Authoritative event season IDs plus verified format-specific ban regimes. Unknown season falls back to global; unverified bans use season-only bucket, explicitly flagged. Straddling events fall back to global.',
            model: 'Frozen quantity-aware card/player/matchup model plus online residual corrections. Champion residual means shrink toward zero; matchup residual means shrink toward champion difference / 2. Seasonal champion means shrink toward historical champion means; seasonal matchup means shrink toward the historical matchup correction plus the seasonal-minus-historical champion correction. Mirrors receive no correction.',
            updates: 'Both adaptive comparators start empty at the evaluation boundary and receive identical completed earlier-event outcomes. Outcomes enter only after recorded completion date, never same-day. Missing/invalid completion dates do not update. Base model and Elo remain frozen; no production publication-time timestamps are available.',
            selection: 'Prior masses 20/100/400 and symmetric calibration scales selected separately for global and seasonal candidates on the later 20% of original training dates, using inner-cutoff frozen model/Elo. No test outcomes choose parameters.',
            comparisons: 'cards = original raw model; adjustedContext = preserved calibrated card model (legacy scorer key); globalAdaptive = matched online comparator without periods; seasonal = official season + ban regimes.',
            uncertainty: '400 paired event-cluster resamples; exploratory, no multiplicity correction. Online state crosses events, so bootstrap does not capture all temporal dependence.',
            limitations: ['Retrospective sequential evaluation, not untouched future validation.', 'Ban coverage begins 2025-12-22 for Standard, 2026-04-03 for Pantheon; earlier periods explicitly unverified.', 'Current catalog; no reconstruction of historic card text or individual deck legality.', 'Seasonal adjustment corrects champion/matchup residuals; does not refit individual-card coefficients per season.', 'Unavailable completion timestamps exclude outcomes from adaptation; recorded completion is only a proxy for result availability.'],
        }, candidates, selected: { global: globalChoice, seasonal: seasonalChoice }, diagnostics: { inner: inner.diagnostics, final: final.diagnostics },
        coverage: { matches: test.length, completionKnown: input.filter(r => r.eventContext?.completed && Number.isFinite(Date.parse(r.eventContext.completed)) && r.eventContext.completed.slice(0,10) >= r.date).length,
            status: Object.fromEntries([...new Set([...seasonal.values()].map(p => p.period.status))].map(status => [status, [...seasonal.values()].filter(p => p.period.status === status).length])),
            noPreviousLocalMatchup: [...seasonal.values()].filter(p => p.localMatches === 0).length },
        holdout: scoreComposition(test, models), bothDecksUnseen: scoreComposition(test.filter(r => !identities.has(r.a.identity) && !identities.has(r.b.identity)), models),
        temporalHalves: [test.slice(0, Math.floor(test.length / 2)), test.slice(Math.floor(test.length / 2))].map(rows => ({ firstDate: rows[0]?.date, lastDate: rows.at(-1)?.date, ...scoreComposition(rows, models) })),
        periods: [...groups].map(([period, rows]) => ({ period, ...scoreComposition(rows, models) })),
        errors: errorBreakdowns(train, test, models.seasonal, 1),
    };
    await verify();
    await writeFile(`${root}data/analysis/card-seasonal-audit.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ coverage: report.coverage, holdout: report.holdout }, null, 2));
}
