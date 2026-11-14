import type { CompositionMatch } from './cardCompositionValidation.js';
import { competitivePeriod, type CompetitiveEvent, type BanRegime } from '../../../shared/src/competitivePeriods.js';
export type SeasonalInput = CompositionMatch & { base: number; eventContext?: CompetitiveEvent };
type Stat = { n: number; sum: number };
/** Prequential residual correction. Both comparators receive identical past outcomes. */
export function seasonalPredictions(input: SeasonalInput[], regimes: BanRegime[], priorMass: number) {
    if (!(priorMass > 0) || !Number.isFinite(priorMass)) throw new Error('Invalid prior mass');
    const stats = new Map<string, Stat>();
    const result = new Map<string, { global: number; seasonal: number; period: ReturnType<typeof competitivePeriod>; localMatches: number }>();
    const pending = new Map<string, (() => void)[]>();
    const key = (...parts: unknown[]) => JSON.stringify(parts);
    const mean = (k: string, fallback = 0) => { const s = stats.get(k); return ((s?.sum ?? 0) + priorMass * fallback) / ((s?.n ?? 0) + priorMass); };
    const add = (k: string, residual: number) => { const s = stats.get(k) ?? { n: 0, sum: 0 }; s.n++; s.sum += residual; stats.set(k, s); };
    const clip = (p: number) => Math.max(.01, Math.min(.99, p));
    const days = new Map<string, SeasonalInput[]>();
    for (const r of input) { const rows = days.get(r.date) ?? []; rows.push(r); days.set(r.date, rows); }
    for (const [date, rows] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
        for (const [completed, updates] of pending) if (completed < date) { updates.forEach(update => update()); pending.delete(completed); }
        for (const r of rows) {
            if (result.has(r.id)) throw new Error('Duplicate match ID');
            const period = competitivePeriod(date, r.format, r.eventContext, regimes);
            const a = r.a.champion, b = r.b.champion, sign = a < b ? 1 : -1;
            const pair = [a, b].sort();
            const globalChampion = (mean(key(r.format, a)) - mean(key(r.format, b))) / 2;
            const global = a === b ? 0 : sign * mean(key(r.format, pair), sign * globalChampion);
            const localChampion = period.key ? (mean(key(period.key, a), mean(key(r.format, a))) - mean(key(period.key, b), mean(key(r.format, b)))) / 2 : globalChampion;
            const local = !period.key ? global : a === b ? 0 : sign * mean(key(period.key, pair), sign * (global + localChampion - globalChampion));
            result.set(r.id, { global: clip(r.base + global), seasonal: clip(r.base + local), period, localMatches: period.key ? stats.get(key(period.key, pair))?.n ?? 0 : 0 });
            // Unknown completion dates never train the online layer. Same-day outcomes cannot leak.
            const completed = r.eventContext?.completed?.slice(0, 10);
            if (completed && Number.isFinite(Date.parse(completed)) && completed >= date) {
                const updates = pending.get(completed) ?? [];
                updates.push(() => {
                    if (a === b) return;
                    const residual = r.score - r.base;
                    for (const scope of [r.format, ...(period.key ? [period.key] : [])]) {
                        add(key(scope, a), residual); add(key(scope, b), -residual); add(key(scope, pair), sign * residual);
                    }
                });
                pending.set(completed, updates);
            }
        }
    }
    return result;
}
