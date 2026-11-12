import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawAndDamageInfluence } from './drawInfluence.js';
import { RECURSION_CARDS } from './recursionPolicy.js';

export const hasRecursionSources = (deck: AnalyticsDeck) => deck.main.some(line => line.quantity > 0 && RECURSION_CARDS.some(name => name === line.name));
export function computeRecursionReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 512) {
  const main = aggregateLines(deck.main).sort((a, b) => a.name.localeCompare(b.name));
  if ([...main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return { status: 'missing' as const };
  const sources = main.filter(line => RECURSION_CARDS.some(name => name === line.name));
  if (sources.some(line => catalog.get(line.name)!.cost_reserve == null)) return { status: 'missing' as const };
  const policy = createRaiDrawPolicy(main, deck.material, catalog);
  if (!policy) return { status: 'unsupported' as const };
  type Sample = { hand: number; memory: number; replayed: number; sources: string[]; targets: string[] };
  const values: Sample[][] = Array.from({ length: 5 }, () => []);
  estimateDrawAndDamageInfluence(policy.main, [], Math.min(7, main.reduce((n, line) => n + line.quantity, 0)), 'first', 5, Math.max(1, Math.floor(samples)), policy.progression, undefined, state => values[state.turn - 1].push(state.recursion));
  const metric = (samples: number[]) => {
    const sorted = samples.slice().sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
    return { ready: samples.filter(n => n > 0).length / samples.length, low: at(.1), median: at(.5), high: at(.9) };
  };
  return { status: 'ready' as const, sources, points: values.map((samples, i) => ({ turn: i + 1,
    returned: metric(samples.map(s => s.hand + s.memory)), hand: metric(samples.map(s => s.hand)), memory: metric(samples.map(s => s.memory)), replayed: metric(samples.map(s => s.replayed)),
    targets: [...new Set(samples.flatMap(s => s.targets))].sort(),
  })) };
}
export function compareRecursionReports(baseline: AnalyticsDeck, target: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 512) {
  const before = computeRecursionReport(baseline, catalog, samples), after = computeRecursionReport(target, catalog, samples);
  if (before.status === 'missing' || after.status === 'missing') return { status: 'missing' as const };
  if (before.status !== 'ready' || after.status !== 'ready') return { status: 'unsupported' as const };
  return { status: 'ready' as const, sources: aggregateLines([...before.sources, ...after.sources]), points: [3, 5].map(turn => ({ turn, before: before.points[turn - 1], after: after.points[turn - 1] })) };
}
