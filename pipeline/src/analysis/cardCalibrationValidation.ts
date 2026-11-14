import type { CompositionDeck, CompositionMatch } from './cardCompositionValidation.js';

/** Symmetric Brier-optimal confidence shrinkage. No intercept, no test-set input. */
export function fitConfidenceScale(points: { predicted: number; observed: number }[]) {
    if (!points.length) throw new Error('Calibration requires observations');
    let numerator = 0, denominator = 0;
    for (const { predicted, observed } of points) {
        if (![predicted, observed].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Invalid calibration observation');
        numerator += (predicted - .5) * (observed - .5);
        denominator += (predicted - .5) ** 2;
    }
    // Restrict to shrinkage: preserve ordering, symmetry and bounded probabilities.
    return denominator ? Math.max(0, Math.min(1, numerator / denominator)) : 1;
}
export const calibrate = (prediction: number, scale: number) => .5 + scale * (prediction - .5);

export function familiarityClassifier(train: CompositionMatch[]) {
    const identities = new Set<string>(), names = new Set<string>();
    for (const row of train) for (const deck of [row.a, row.b]) {
        identities.add(deck.identity);
        for (const [name] of deck.cards) names.add(name);
    }
    return (deck: CompositionDeck) => {
        if (identities.has(deck.identity)) return 'Exact list seen';
        const total = deck.cards.reduce((sum, [, quantity]) => sum + quantity, 0);
        const unknown = deck.cards.reduce((sum, [name, quantity]) => sum + (names.has(name) ? 0 : quantity), 0);
        if (!total) return 'No cards';
        if (!unknown) return 'New list, all cards seen';
        return unknown / total <= .1 ? 'New list, up to 10% unseen copies' : 'New list, over 10% unseen copies';
    };
}

export interface ErrorObservation { event: string; id: string; predicted: number; calibrated: number; observed: number }
export function summarizeErrors(rows: ErrorObservation[]) {
    const n = rows.length;
    const mean = (f: (r: ErrorObservation) => number) => n ? rows.reduce((s, r) => s + f(r), 0) / n : null;
    const clusters = new Map<string, { n: number; improvement: number; bias: number }>();
    for (const r of rows) {
        const c = clusters.get(r.event) ?? { n: 0, improvement: 0, bias: 0 };
        c.n++; c.improvement += (r.predicted - r.observed) ** 2 - (r.calibrated - r.observed) ** 2;
        c.bias += r.calibrated - r.observed;
        clusters.set(r.event, c);
    }
    const samples: { improvement: number; bias: number }[] = [];
    let seed = 713;
    const values = [...clusters.values()];
    if (values.length >= 20) for (let b = 0; b < 400; b++) {
        let count = 0, improvement = 0, bias = 0;
        for (let i = 0; i < values.length; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const c = values[Math.floor(seed / 4294967296 * values.length)];
            count += c.n; improvement += c.improvement; bias += c.bias;
        }
        samples.push({ improvement: improvement / count, bias: bias / count });
    }
    const interval = (key: 'improvement' | 'bias') => {
        const sorted = samples.map(s => s[key]).sort((a, b) => a - b);
        return sorted.length ? [sorted[10], sorted[389]] : null;
    };
    return { appearances: n, matches: new Set(rows.map(r => r.id)).size, events: values.length,
        sufficientSupport: n >= 100 && values.length >= 20,
        predicted: mean(r => r.predicted), calibrated: mean(r => r.calibrated), observed: mean(r => r.observed),
        rawBias: mean(r => r.predicted - r.observed), calibratedBias: mean(r => r.calibrated - r.observed),
        rawError: mean(r => (r.predicted - r.observed) ** 2), calibratedError: mean(r => (r.calibrated - r.observed) ** 2),
        improvement95: interval('improvement'), calibratedBias95: interval('bias') };
}

/** Champion/familiarity use both players; matchup uses one canonical orientation per match. */
export function errorBreakdowns(train: CompositionMatch[], test: CompositionMatch[], predict: (r: CompositionMatch) => number, scale: number) {
    const classify = familiarityClassifier(train);
    const champion = new Map<string, ErrorObservation[]>(), matchup = new Map<string, ErrorObservation[]>(), familiarity = new Map<string, ErrorObservation[]>();
    const append = (groups: Map<string, ErrorObservation[]>, key: string, row: ErrorObservation) => {
        const group = groups.get(key) ?? []; group.push(row); groups.set(key, group);
    };
    for (const r of test) {
        const p = predict(r), c = calibrate(p, scale);
        const a = { id: r.id, event: r.event, predicted: p, calibrated: c, observed: r.score };
        const b = { ...a, predicted: 1 - p, calibrated: 1 - c, observed: 1 - r.score };
        for (const [deck, observation] of [[r.a, a], [r.b, b]] as const) {
            append(champion, deck.champion, observation);
            append(familiarity, classify(deck), observation);
        }
        const reverse = r.a.champion > r.b.champion;
        append(matchup, JSON.stringify([r.format, ...[r.a.champion, r.b.champion].sort()]), reverse ? b : a);
    }
    const summarize = (groups: Map<string, ErrorObservation[]>) => [...groups].map(([key, rows]) => ({ key, ...summarizeErrors(rows) })).sort((a, b) => b.appearances - a.appearances || a.key.localeCompare(b.key));
    return { champion: summarize(champion), matchup: summarize(matchup), familiarity: summarize(familiarity) };
}
