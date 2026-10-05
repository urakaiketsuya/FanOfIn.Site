import type { BattleChartEntry } from './analysis-types';
import { scoreExpectedField } from './expectedField';

/** Deterministic averaged multiplicative weights; reports an actual saddle-point gap. */
export function solveMatrixGame(matrix: number[][], iterations = 20_000) {
  const rows = matrix.length, columns = matrix[0]?.length ?? 0;
  if (!rows || !columns || matrix.some(row => row.length !== columns || row.some(value => !Number.isFinite(value) || value < 0 || value > 1))) throw new Error('Expected a nonempty rectangular payoff matrix in [0,1]');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) throw new Error('Invalid iteration budget');
  const rowLog = Array(rows).fill(0), columnLog = Array(columns).fill(0);
  const rowSum = Array(rows).fill(0), columnSum = Array(columns).fill(0);
  const rate = Math.sqrt(8 * Math.log(Math.max(2, rows, columns)) / iterations);
  const distribution = (logs: number[]): number[] => {
    const max = Math.max(...logs), weights = logs.map(value => Math.exp(value - max));
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(value => value / total);
  };
  for (let step = 0; step < iterations; step++) {
    const p = distribution(rowLog), q = distribution(columnLog);
    // Both updates use the same pre-update strategies.
    for (let i = 0; i < rows; i++) {
      rowSum[i] += p[i];
      rowLog[i] += rate * matrix[i].reduce((sum, value, j) => sum + value * q[j], 0);
    }
    for (let j = 0; j < columns; j++) {
      columnSum[j] += q[j];
      columnLog[j] -= rate * matrix.reduce((sum, row, i) => sum + row[j] * p[i], 0);
    }
  }
  const rowStrategy: number[] = rowSum.map(value => value / iterations);
  const columnStrategy: number[] = columnSum.map(value => value / iterations);
  const lower = Math.min(...Array.from({ length: columns }, (_, j) => matrix.reduce((sum, row, i) => sum + row[j] * rowStrategy[i], 0)));
  const upper = Math.max(...matrix.map(row => row.reduce((sum, value, j) => sum + value * columnStrategy[j], 0)));
  return { rowStrategy, columnStrategy, lower, upper, gap: Math.max(0, upper - lower), iterations };
}

/** Same Champion choices on both sides. Unknown payoffs stay [0,1], never imputed as 50%. */
export function benchmarkFieldEquilibrium(candidates: string[], chart: BattleChartEntry[], iterations = 20_000) {
  const champions = [...new Set(candidates)].sort();
  if (!champions.length) return null;
  const lower = champions.map(() => [] as number[]), upper = champions.map(() => [] as number[]);
  let missingPairs = 0;
  for (let j = 0; j < champions.length; j++) {
    const scores = new Map(scoreExpectedField(champions, [{ champion: champions[j], weight: 1 }], chart).map(row => [row.champion, row]));
    for (let i = 0; i < champions.length; i++) {
      const score = scores.get(champions[i])!;
      lower[i][j] = score.lower;
      upper[i][j] = Math.max(score.lower, score.upper);
      if (i < j && score.missing.length) missingPairs++;
    }
  }
  const pessimistic = solveMatrixGame(lower, iterations), optimistic = solveMatrixGame(upper, iterations);
  return { champions, missingPairs, totalPairs: champions.length * (champions.length - 1) / 2,
    pessimistic, optimistic,
    guaranteedScore: pessimistic.lower, possibleScore: optimistic.upper,
    // Strategies belong to bounding games, not an identified equilibrium of unknown payoffs.
    strategies: champions.map((champion, i) => ({ champion, conservativeShare: pessimistic.rowStrategy[i], optimisticShare: optimistic.rowStrategy[i] })) };
}
