import type { CompositionMatch } from './cardCompositionValidation.js';
export type AdjustedMatch = CompositionMatch & { playerA: string; playerB: string; prediction: number; equalSkill: number };
type Appearance = { event: string; pilot: string; identity: string; champion: string; format: string; actual: number; elo: number; predicted: number; equalSkill: number };
function summarize(rows: Appearance[]) {
    const average = (get: (r: Appearance) => number) => rows.length ? rows.reduce((s, r) => s + get(r), 0) / rows.length : null;
    const clusters = new Map<string, { n: number; residual: number }>();
    for (const r of rows) { const c = clusters.get(r.event) ?? { n: 0, residual: 0 }; c.n++; c.residual += r.actual - r.elo; clusters.set(r.event, c); }
    let interval: [number, number] | null = null;
    if (clusters.size >= 20) {
        let seed = 713;
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        const events = [...clusters.values()], samples: number[] = [];
        for (let i = 0; i < 400; i++) {
            let sum = 0, n = 0;
            for (let j = 0; j < events.length; j++) { const c = events[Math.floor(random() * events.length)]; sum += c.residual; n += c.n; }
            samples.push(sum / n);
        }
        samples.sort((a, b) => a - b); interval = [samples[10], samples[389]];
    }
    const pilots = new Map<string, number>();
    for (const r of rows) pilots.set(r.pilot, (pilots.get(r.pilot) ?? 0) + 1);
    return { appearances: rows.length, events: clusters.size, pilots: pilots.size, deckLists: new Set(rows.map(r => r.identity)).size,
        largestPilotShare: rows.length ? Math.max(...pilots.values()) / rows.length : null,
        observedScore: average(r => r.actual), eloExpectedScore: average(r => r.elo), abovePlayerExpectation: average(r => r.actual - r.elo), abovePlayerExpectation95: interval,
        seasonalExpectedScore: average(r => r.predicted), equalSkillAgainstObservedOpponents: average(r => r.equalSkill) };
}
export function playerAdjustedReport(matches: AdjustedMatch[]) {
    const appearances: Appearance[] = matches.flatMap(r => [
        { event: r.event, pilot: r.playerA, identity: r.a.identity, champion: r.a.champion, format: r.format, actual: r.score, elo: r.prior, predicted: r.prediction, equalSkill: r.equalSkill },
        { event: r.event, pilot: r.playerB, identity: r.b.identity, champion: r.b.champion, format: r.format, actual: 1-r.score, elo: 1-r.prior, predicted: 1-r.prediction, equalSkill: 1-r.equalSkill },
    ]);
    const group = (key: (r: Appearance) => string) => {
        const groups = new Map<string, Appearance[]>();
        for (const r of appearances) { const k = key(r); const g = groups.get(k) ?? []; g.push(r); groups.set(k, g); }
        return [...groups].map(([key, rows]) => ({ key, ...summarize(rows) })).sort((a,b) => b.appearances-a.appearances || a.key.localeCompare(b.key));
    };
    const error = (get: (r: AdjustedMatch) => number) => matches.length ? matches.reduce((s,r) => s + (get(r)-r.score)**2,0)/matches.length : null;
    const decks = group(r=>JSON.stringify([r.format,r.identity]));
    const supportedDecks = decks.filter(r=>r.appearances >= 20 && r.events >= 5 && r.pilots >= 3);
    return { deckCoverage: { totalExactLists: decks.length, reportedExactLists: supportedDecks.length,
            minimumAppearances: 20, minimumEvents: 5, minimumPilots: 3 }, overall: { matches: matches.length, events: new Set(matches.map(r=>r.event)).size,
        eloPredictionError: error(r=>r.prior), seasonalPredictionError: error(r=>r.prediction) },
        calibration: Array.from({length:10}, (_,i) => ({ from:i/10, to:(i+1)/10,
            ...summarize(appearances.filter(r=>Math.min(9,Math.floor(r.predicted*10))===i)) })),
        champions: group(r=>JSON.stringify([r.format,r.champion])), decks: supportedDecks };
}
