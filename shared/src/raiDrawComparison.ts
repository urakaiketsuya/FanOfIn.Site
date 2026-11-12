import type { Card } from './api-types.js';
import type { AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawInfluence } from './drawInfluence.js';

export function computeRaiDrawReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  if (!deck.material.some(line => line.quantity > 0 && line.name.startsWith('Rai,'))) return null;
  const counts = new Map<string, number>();
  for (const line of deck.main) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const main = [...counts].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
  if ([...main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return { status: 'missing' as const };
  const policy = createRaiDrawPolicy(main, deck.material, catalog);
  if (!policy) return { status: 'unsupported' as const };
  return {
    status: 'ready' as const,
    points: estimateDrawInfluence(policy.main, [], Math.min(7, policy.main.reduce((sum, line) => sum + line.quantity, 0)), 'first', 5, 512, policy.progression),
    sources: [...policy.modeled].sort().map(name => ({ name, quantity: [...main, ...deck.material].filter(line => line.name === name).reduce((sum, line) => sum + line.quantity, 0) })),
  };
}

export function compareRaiDrawReports(baseline: AnalyticsDeck, target: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  if (![baseline, target].some(deck => deck.material.some(line => line.quantity > 0 && line.name.startsWith('Rai,')))) return null;
  if ([baseline, target].some(deck => [...deck.main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name)))) return { status: 'missing' as const };
  const before = computeRaiDrawReport(baseline, catalog), after = computeRaiDrawReport(target, catalog);
  if (before?.status !== 'ready' || after?.status !== 'ready') return { status: 'unsupported' as const };
  return {
    status: 'ready' as const,
    points: [3, 5].map(turn => ({
      turn, before: before.points[turn - 1], after: after.points[turn - 1],
      medianDelta: after.points[turn - 1].seenRange.median - before.points[turn - 1].seenRange.median,
    })),
    sources: [...new Set([...before.sources, ...after.sources].map(source => source.name))].sort().map(name => ({
      name, before: before.sources.find(source => source.name === name)?.quantity ?? baseline.main.concat(baseline.material).filter(line => line.name === name).reduce((sum,line)=>sum+line.quantity,0),
      after: after.sources.find(source => source.name === name)?.quantity ?? target.main.concat(target.material).filter(line => line.name === name).reduce((sum,line)=>sum+line.quantity,0),
    })),
  };
}
