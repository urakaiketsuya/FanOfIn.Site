import type { DrawRange } from '@gatcg/shared';
import type { ImpactRow } from './swapImpact';

const number = (value: number) => String(Number(value.toFixed(1)));

/** Neutral direction: more damage, self-damage, and draw are not a universal ranking. */
export function impactChange(row: ImpactRow): string {
  const delta = row.after.median - row.before.median;
  const rounded = Number(delta.toFixed(1));
  if (delta === 0) {
    const rangeChanged = row.before.low !== row.after.low || row.before.high !== row.after.high;
    return rangeChanged ? 'Range changed' : row.probability ? 'Same chance' : 'Same median';
  }
  const amount = rounded === 0 ? '<0.1' : number(Math.abs(delta));
  return `${delta > 0 ? '+' : '−'}${amount} ${row.unit}${row.probability ? '' : ' median'}`;
}

export function impactValue(row: ImpactRow, value: DrawRange): string {
  return row.probability ? `${number(value.median)}%` : `${value.low}–${value.high} ${row.unit} · ${value.median} median`;
}
