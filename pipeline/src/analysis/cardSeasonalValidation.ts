import { seasonalCorrection, type ResidualStats } from '../../../shared/src/deckForecast.js';
import type { CompositionMatch } from './cardCompositionValidation.js';
import { competitivePeriod, type CompetitiveEvent, type BanRegime } from '../../../shared/src/competitivePeriods.js';
export type SeasonalInput = CompositionMatch & { base: number; equalSkillBase?: number; eventContext?: CompetitiveEvent };
/** Prequential residual correction. Both comparators receive identical past outcomes. */
export function seasonalPredictions(input: SeasonalInput[], regimes: BanRegime[], priorMass: number, snapshot?: { asOf: string; capture: (stats: ResidualStats) => void }) {
    if (snapshot && input.some(r => r.date >= snapshot.asOf)) throw new Error('Snapshot includes matches on or after its as-of date');
    if (!(priorMass > 0) || !Number.isFinite(priorMass)) throw new Error('Invalid prior mass');
    const stats: ResidualStats = {};
    const result = new Map<string, { global: number; seasonal: number; equalSkill?: number; period: ReturnType<typeof competitivePeriod>; localMatches: number }>();
    const pending = new Map<string, (() => void)[]>();
    const key = (...parts: unknown[]) => JSON.stringify(parts);
    const add = (k: string, residual: number) => { const s = stats[k] ?? { n: 0, sum: 0 }; s.n++; s.sum += residual; stats[k] = s; };
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
            const { global, local } = seasonalCorrection(stats, priorMass, r.format, period.key, a, b);
            result.set(r.id, { global: clip(r.base + global), seasonal: clip(r.base + local), ...(r.equalSkillBase === undefined ? {} : { equalSkill: clip(r.equalSkillBase + local) }), period, localMatches: period.key ? stats[key(period.key, pair)]?.n ?? 0 : 0 });
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
    if (snapshot) {
        for (const [completed, updates] of pending) if (completed < snapshot.asOf) updates.forEach(update => update());
        snapshot.capture(stats);
    }
    return result;
}
