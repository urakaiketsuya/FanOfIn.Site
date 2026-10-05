import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { aggregateFieldHistory, benchmarkFieldEquilibrium, fieldWindowStart, type FieldHistoryData } from '@gatcg/shared';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
const root = new URL('../../', import.meta.url);
const history = JSON.parse(await readFile(new URL('data/analysis/field-history.json', root), 'utf8')) as FieldHistoryData;
const benchmarks = [...new Set(history.events.map(event => event.format))].sort().map(format => {
  const to = history.events.filter(event => event.format === format).map(event => event.date).sort().at(-1)!;
  const scope = { format, from: fieldWindowStart(to), to };
  const aggregate = aggregateFieldHistory(history.events, scope, history.minMatchups);
  // Do not manufacture a model when the format has no qualifying nonmirror matchups.
  const result = aggregate.battleChart.some(row => row.a !== row.b) ? benchmarkFieldEquilibrium(aggregate.champions.map(row => row.champion), aggregate.battleChart) : null;
  return { ...scope, events: aggregate.events, result };
});
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/field-equilibrium.json', root)), {
  sourceGeneratedAt: history.generatedAt, minMatchups: history.minMatchups,
  interpretation: 'Bounding-game strategy benchmark, not attendance prediction or statistical confidence. Missing matchups remain [0,1]. Numerical saddle-point gaps are separate from evidence uncertainty.', benchmarks,
}, 2);
for (const { result, ...scope } of benchmarks) console.log(JSON.stringify({ ...scope, missingPairs: result?.missingPairs,
  totalPairs: result?.totalPairs, guaranteedScore: result?.guaranteedScore, possibleScore: result?.possibleScore,
  numericalGaps: result ? [result.pessimistic.gap, result.optimistic.gap] : null,
  topConservativeShares: result?.strategies.slice().sort((a, b) => b.conservativeShare - a.conservativeShare).slice(0, 5) }));
