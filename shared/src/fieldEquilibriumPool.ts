import type { BattleChartEntry } from './analysis-types';
import { scoreExpectedField, type FieldWeight } from './expectedField';

/** Popularity-first greedy pool: every included nonmirror pair has qualifying evidence.
 * This is a deterministic coverage filter, not a largest-clique or strength search.
 * The caller supplies an already pooled and sample-thresholded chart.
 */
export function selectFieldEquilibriumPool(field: FieldWeight[], chart: BattleChartEntry[]) {
  const weights = new Map<string, number>();
  for (const row of field) {
    if (!Number.isFinite(row.weight) || row.weight < 0) throw new Error('Invalid field weight');
    weights.set(row.champion, (weights.get(row.champion) ?? 0) + row.weight);
  }
  const population = [...weights].filter(([, weight]) => weight > 0)
    .map(([champion, weight]) => ({ champion, weight }))
    .sort((a, b) => b.weight - a.weight || a.champion.localeCompare(b.champion));
  const total = population.reduce((sum, row) => sum + row.weight, 0);
  if (!Number.isFinite(total)) throw new Error('Invalid total field weight');
  const included: string[] = [];
  const excluded: { champion: string; share: number; missingAgainst: string[] }[] = [];
  for (const row of population) {
    const score = scoreExpectedField([row.champion], included.map(champion => ({ champion, weight: 1 })), chart)[0];
    if (!included.length || score.missing.length === 0) included.push(row.champion);
    else excluded.push({ champion: row.champion, share: row.weight / total, missingAgainst: score.missing });
  }
  // Show gaps against the final pool, including Champions added after an exclusion.
  for (const row of excluded) row.missingAgainst = scoreExpectedField([row.champion], included.map(champion => ({ champion, weight: 1 })), chart)[0].missing;
  const includedWeight = population.filter(row => included.includes(row.champion)).reduce((sum, row) => sum + row.weight, 0);
  return { included, excluded, retainedFieldShare: total ? includedWeight / total : 0,
    usable: included.length >= 2, selection: 'popularity-first-complete-coverage' as const };
}
