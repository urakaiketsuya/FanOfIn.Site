import { scoreExpectedField, type FieldWeight } from './expectedField';
import { aggregateFieldHistory, type FieldEvent } from './fieldHistory';

export interface FieldResamplingResult {
  champion: string;
  evidenceEvents: number;
  lower: number | null;
  upper: number | null;
}
export const FIELD_RESAMPLES = 300;

/** Event-cluster resampling diagnostic, conditional on fixed opponent weights; not calibrated confidence. */
export function resampleExpectedField(candidates: string[], field: FieldWeight[], events: FieldEvent[], minMatchups = 5): FieldResamplingResult[] {
  if (!scoreExpectedField(candidates, field, []).length) return [];
  // Stable ordering makes the seeded experiment reproducible across artifact ordering changes.
  const selected = [...events].sort((a, b) => a.id - b.id);
  if (new Set(selected.map(e => e.format)).size > 1 || new Set(selected.map(e => e.id)).size !== selected.length) return [];
  const opponents = new Set(field.filter(row => row.weight > 0).map(row => row.champion));
  const rows = [...new Set(candidates)].map(champion => ({ champion,
    evidenceEvents: selected.filter(e => e.battleChart.some(r => r.a !== r.b && r.games > 0 &&
      [r.aWins, r.bWins, r.ties, r.games].every(n => Number.isFinite(n) && n >= 0) && r.aWins + r.bWins + r.ties === r.games &&
      ((r.a === champion && opponents.has(r.b)) || (r.b === champion && opponents.has(r.a))))).length,
    lows: [] as number[], highs: [] as number[],
  }));
  const eligible = rows.filter(row => row.evidenceEvents >= 5);
  const scope = { format: selected[0]?.format ?? '', from: '0000-01-01', to: '9999-12-31' };
  let seed = 0x6d2b79f5;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  for (let iteration = 0; eligible.length && iteration < FIELD_RESAMPLES; iteration++) {
    const sample = Array.from({ length: selected.length }, () => selected[Math.floor(random() * selected.length)]);
    const chart = aggregateFieldHistory(sample, scope, minMatchups).battleChart;
    const scores = new Map(scoreExpectedField(eligible.map(row => row.champion), field, chart).map(row => [row.champion, row]));
    for (const row of eligible) {
      const score = scores.get(row.champion)!;
      row.lows.push(score.lower); row.highs.push(score.upper);
    }
  }
  const percentile = (values: number[], p: number) => {
    values.sort((a, b) => a - b);
    const position = (values.length - 1) * p, index = Math.floor(position);
    return values[index] + (values[Math.min(index + 1, values.length - 1)] - values[index]) * (position - index);
  };
  return rows.map(row => ({ champion: row.champion, evidenceEvents: row.evidenceEvents,
    lower: row.lows.length ? percentile(row.lows, 0.05) : null,
    upper: row.highs.length ? percentile(row.highs, 0.95) : null,
  }));
}
