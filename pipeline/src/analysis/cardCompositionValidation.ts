/** Offline card-composition experiment. All selection and fitting use training matches only. */
export interface CompositionDeck {
    identity: string;
    champion: string;
    cards: [
        string,
        number
    ][];
}
export interface CompositionMatch {
    id: string;
    event: string;
    date: string;
    format: string;
    score: number;
    prior: number;
    a: CompositionDeck;
    b: CompositionDeck;
}
const clip = (x: number) => Math.max(.01, Math.min(.99, x));
const pairKey = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a]);
function pairs(deck: CompositionDeck) {
    const names = [...new Set(deck.cards.map(c => c[0]))].sort();
    return names.flatMap((a, i) => names.slice(i + 1).map(b => pairKey(a, b)));
}
function context(r: CompositionMatch): Map<string, number> {
    const x = new Map<string, number>();
    const add = (key: string, v: number) => x.set(key, (x.get(key) ?? 0) + v);
    add(`champ:${r.format}:${r.a.champion}`, 1);
    add(`champ:${r.format}:${r.b.champion}`, -1);
    if (r.a.champion !== r.b.champion)
        add(`matchup:${r.format}:${pairKey(r.a.champion, r.b.champion)}`, r.a.champion < r.b.champion ? 1 : -1);
    return x;
}
export function fitComposition(train: CompositionMatch[], options = { minimumPairMatches: 100, minimumPairEvents: 20, maximumPairs: 3000, penalty: 100, passes: 2000 }) {
    const stats = new Map<string, {
        sum: number;
        n: number;
    }>();
    const support = new Map<string, {
        n: number;
        events: Set<string>;
    }>();
    const deckPairs = new Map<string, string[]>();
    let selectedPairs: Set<string> | null = null;
    const getPairs = (d: CompositionDeck) => { let p = deckPairs.get(d.identity); if (!p) {
        p = pairs(d);
        if (selectedPairs) p = p.filter(key => selectedPairs!.has(key));
        deckPairs.set(d.identity, p);
    } return p; };
    for (const r of train) {
        for (const [deck, y] of [[r.a, r.score], [r.b, 1 - r.score]] as const)
            for (const [name] of deck.cards) {
                const s = stats.get(name) ?? { sum: 0, n: 0 };
                s.sum += y;
                s.n++;
                stats.set(name, s);
            }
        for (const key of new Set([...getPairs(r.a), ...getPairs(r.b)])) {
            const s = support.get(key) ?? { n: 0, events: new Set<string>() };
            s.n++;
            s.events.add(r.event);
            support.set(key, s);
        }
    }
    const selected = new Set([...support].filter(([, s]) => s.n >= options.minimumPairMatches && s.events.size >= options.minimumPairEvents).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).slice(0, options.maximumPairs).map(([k]) => k));
    selectedPairs = selected;
    for (const [identity, keys] of deckPairs) deckPairs.set(identity, keys.filter(key => selected.has(key)));
    support.clear();
    const features = (r: CompositionMatch, mode: number) => {
        const x = context(r);
        for (const [d, sign] of [[r.a, 1], [r.b, -1]] as const) {
            const add = (k: string, v: number) => x.set(k, (x.get(k) ?? 0) + sign * v);
            if (mode >= 1)
                for (const [name, quantity] of d.cards)
                    add(`card:${name}`, quantity / 4);
            if (mode >= 2)
                for (const key of getPairs(d))
                    if (selected.has(key))
                        add(`pair:${key}`, 1);
        }
        return x;
    };
    const fit = (mode: number) => {
        const columns = new Map<string, {
            indices: number[];
            values: number[];
            norm: number;
            coefficient: number;
        }>();
        train.forEach((r, i) => {
            for (const [key, value] of features(r, mode))
                if (value) {
                    const c = columns.get(key) ?? { indices: [], values: [], norm: options.penalty, coefficient: 0 };
                    c.indices.push(i);
                    c.values.push(value);
                    c.norm += value * value;
                    columns.set(key, c);
                }
        });
        // Solve (X'X + lambda I) beta = X'(y - prior) with diagonally
        // preconditioned conjugate gradients. Never materialize dense X'X.
        const cs = [...columns.values()];
        const rhs = Float64Array.from(cs.map(c => c.indices.reduce((sum, index, j) => sum + c.values[j] * (train[index].score - train[index].prior), 0)));
        const residual = rhs.slice();
        const direction = Float64Array.from(cs.map((c, j) => residual[j] / c.norm));
        let rz = residual.reduce((sum, v, j) => sum + v * direction[j], 0);
        const rhsNorm = Math.sqrt(rhs.reduce((sum, v) => sum + v * v, 0));
        let relativeResidual = rhsNorm ? 1 : 0, delta = 0, passes = 0;
        const projected = new Float64Array(train.length);
        const product = new Float64Array(cs.length);
        for (; passes < options.passes && relativeResidual > 1e-8; passes++) {
            projected.fill(0);
            cs.forEach((c, j) => {
                for (let k = 0; k < c.indices.length; k++) projected[c.indices[k]] += c.values[k] * direction[j];
            });
            cs.forEach((c, j) => {
                let sum = options.penalty * direction[j];
                for (let k = 0; k < c.indices.length; k++) sum += c.values[k] * projected[c.indices[k]];
                product[j] = sum;
            });
            const denominator = direction.reduce((sum, v, j) => sum + v * product[j], 0);
            if (!(denominator > 0)) throw new Error('Ridge solver lost positive definiteness');
            const alpha = rz / denominator;
            delta = 0;
            cs.forEach((c, j) => {
                const change = alpha * direction[j];
                c.coefficient += change;
                delta = Math.max(delta, Math.abs(change));
                residual[j] -= alpha * product[j];
            });
            relativeResidual = Math.sqrt(residual.reduce((sum, v) => sum + v * v, 0)) / rhsNorm;
            const nextRz = residual.reduce((sum, v, j) => sum + v * v / cs[j].norm, 0);
            const beta = nextRz / rz;
            cs.forEach((c, j) => { direction[j] = residual[j] / c.norm + beta * direction[j]; });
            rz = nextRz;
        }
        // Prediction needs only coefficients, not the sparse training matrix.
        const coefficients = new Map([...columns].map(([key, column]) => [key, column.coefficient]));
        return { predict: (r: CompositionMatch) => clip(r.prior + [...features(r, mode)].reduce((s, [k, v]) => s + v * (coefficients.get(k) ?? 0), 0)), diagnostics: { features: columns.size, passes, maximumLastCoefficientChange: delta, relativeNormalEquationResidual: relativeResidual, converged: relativeResidual <= 1e-8 } };
    };
    const average = (d: CompositionDeck) => {
        let sum = 0, n = 0;
        for (const [name, q] of d.cards) {
            const s = stats.get(name);
            sum += q * ((s?.sum ?? 0) + 10) / ((s?.n ?? 0) + 20);
            n += q;
        }
        return n ? sum / n : .5;
    };
    const adjustedContext = fit(0), cards = fit(1), cardPairs = fit(2);
    return { models: { playerBaseline: (r: CompositionMatch) => r.prior, cardAverage: (r: CompositionMatch) => clip(.5 + average(r.a) - average(r.b)), adjustedContext: adjustedContext.predict, cards: cards.predict, cardPairs: cardPairs.predict }, diagnostics: { selectedPairs: selected.size, cardCount: stats.size, adjustedContext: adjustedContext.diagnostics, cards: cards.diagnostics, cardPairs: cardPairs.diagnostics }, options };
}
export function scoreComposition(rows: CompositionMatch[], models: Record<string, (r: CompositionMatch) => number>) {
    const predictions = Object.fromEntries(Object.entries(models).map(([name, p]) => [name, rows.map(p)]));
    const interval = (p: number[], reference: number[]) => {
        const groups = new Map<string, {
            sum: number;
            n: number;
        }>();
        rows.forEach((r, i) => { const g = groups.get(r.event) ?? { sum: 0, n: 0 }; g.sum += (reference[i] - r.score) ** 2 - (p[i] - r.score) ** 2; g.n++; groups.set(r.event, g); });
        if (groups.size < 20)
            return null;
        const clusters = [...groups.values()];
        let seed = 713;
        const samples = Array.from({ length: 400 }, () => { let sum = 0, n = 0; for (let i = 0; i < clusters.length; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const g = clusters[Math.floor(seed / 4294967296 * clusters.length)];
            sum += g.sum;
            n += g.n;
        } return sum / n; }).sort((a, b) => a - b);
        return [samples[10], samples[389]];
    };
    return { matches: rows.length, events: new Set(rows.map(r => r.event)).size, models: Object.fromEntries(Object.entries(predictions).map(([name, p]) => [name, { meanSquaredMatchPointError: rows.length ? p.reduce((s, v, i) => s + (v - rows[i].score) ** 2, 0) / rows.length : null, improvementOverContext95: interval(p, predictions.adjustedContext), improvementOverCards95: interval(p, predictions.cards), calibration: Array.from({ length: 10 }, (_, i) => { const indices = p.flatMap((v, j) => Math.floor(v * 10) === i ? [j] : []); return { from: i / 10, matches: indices.length, predicted: indices.length ? indices.reduce((s, j) => s + p[j], 0) / indices.length : null, observed: indices.length ? indices.reduce((s, j) => s + rows[j].score, 0) / indices.length : null }; }) }])) };
}
