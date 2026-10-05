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
