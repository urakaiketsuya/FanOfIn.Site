import type { ArchetypeSummary, BattleChartEntry } from './analysis-types';
import { shrinkWinRate } from './winRateShrinkage';

export interface FieldWeight { champion: string; weight: number }
export interface FieldResult {
  champion: string;
  coverage: number;
  lower: number;
  upper: number;
  games: number;
  missing: string[];
}

export interface FieldStressResult extends FieldResult {
  stressLower: number;
  stressUpper: number;
  stressCoverage: number;
  worstOpponents: string[];
}

/** Keep (1 - shift) of the field; redistribute the rest among positive-weight opponents. */
export function stressExpectedField(candidates: string[], field: FieldWeight[], chart: BattleChartEntry[], shift = 0.2): FieldStressResult[] {
  if (!Number.isFinite(shift) || shift < 0 || shift > 1) return [];
  const baseline = scoreExpectedField(candidates, field, chart);
  if (!baseline.length) return [];
  if (shift === 0) return baseline.map(row => ({ ...row, stressLower: row.lower, stressUpper: row.upper, stressCoverage: row.coverage, worstOpponents: [] }));
  const opponents = [...new Set(field.filter(row => row.weight > 0).map(row => row.champion))].sort();
  const endpoints = opponents.map(champion => new Map(scoreExpectedField(candidates, [{ champion, weight: 1 }], chart).map(row => [row.champion, row])));
  return baseline.map(row => {
    const scores = endpoints.map(endpoint => endpoint.get(row.champion)!);
    const lowest = Math.min(...scores.map(score => score.lower));
    return {
      ...row,
      stressLower: (1 - shift) * row.lower + shift * lowest,
      stressUpper: (1 - shift) * row.upper + shift * Math.max(...scores.map(score => score.upper)),
      stressCoverage: (1 - shift) * row.coverage + shift * Math.min(...scores.map(score => score.coverage)),
      worstOpponents: shift === 0 ? [] : opponents.filter((_, index) => Math.abs(scores[index].lower - lowest) < 1e-12),
    };
  }).sort((a, b) => b.stressLower - a.stressLower || b.stressCoverage - a.stressCoverage || a.champion.localeCompare(b.champion));
}

/** Champion identities only; named Spirits overlap these populations. */
export function publishedField(archetypes: Pick<ArchetypeSummary, 'signature' | 'deckCount'>[]): FieldWeight[] {
  const counts = new Map<string, number>();
  for (const row of archetypes) {
    if (Number.isFinite(row.deckCount) && row.deckCount > 0)
      counts.set(row.signature, (counts.get(row.signature) ?? 0) + row.deckCount);
  }
  return [...counts].map(([champion, weight]) => ({ champion, weight }));
}

/** Missing-matchup bounds, not confidence intervals. Draws earn half a point. */
export function scoreExpectedField(candidates: string[], field: FieldWeight[], chart: BattleChartEntry[]): FieldResult[] {
  const weights = new Map<string, number>();
  for (const { champion, weight } of field) {
    if (!Number.isFinite(weight) || weight < 0) return [];
    weights.set(champion, (weights.get(champion) ?? 0) + weight);
  }
  const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(total) || total <= 0) return [];
  const matchups = new Map<string, BattleChartEntry>();
  const key = (a: string, b: string) => JSON.stringify([a, b].sort());
  for (const row of chart) {
    if (row.games > 0 && [row.games, row.aWins, row.bWins, row.ties].every(n => Number.isFinite(n) && n >= 0)
      && row.aWins + row.bWins + row.ties === row.games) matchups.set(key(row.a, row.b), row);
  }
  return [...new Set(candidates)].map(champion => {
    let lower = 0, coverage = 0, games = 0;
    const missing: string[] = [];
    for (const [opponent, weight] of weights) {
      if (weight === 0) continue;
      const share = weight / total;
      if (opponent === champion) { lower += share * 0.5; coverage += share; continue; }
      const row = matchups.get(key(champion, opponent));
      if (!row) { missing.push(opponent); continue; }
      const wins = row.a === champion ? row.aWins : row.bWins;
      lower += share * shrinkWinRate(wins + row.ties * 0.5, row.games, 10).adjustedWinRate;
      coverage += share;
      games += row.games;
    }
    coverage = Math.min(1, coverage);
    return { champion, lower, upper: Math.min(1, lower + 1 - coverage), coverage, games, missing };
  }).sort((a, b) => b.lower - a.lower || b.coverage - a.coverage || a.champion.localeCompare(b.champion));
}
