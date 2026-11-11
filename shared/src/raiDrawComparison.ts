import type { Card } from './api-types.js';
import type { AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawInfluence } from './drawInfluence.js';

export function compareRaiDrawReports(baseline: AnalyticsDeck, target: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  if (![baseline, target].some(deck => deck.material.some(line => line.quantity > 0 && line.name.startsWith('Rai,')))) return null;
  const decks = [baseline, target].map(deck => {
    const counts = new Map<string, number>();
    for (const line of deck.main) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
    return { ...deck, main: [...counts].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name)) };
  });
  if (decks.some(deck => [...deck.main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name)))) return { status: 'missing' as const };
  const policies = decks.map(deck => createRaiDrawPolicy(deck.main, deck.material, catalog));
  if (!policies[0] || !policies[1]) return { status: 'unsupported' as const };
  const forecasts = policies.map(policy => estimateDrawInfluence(policy!.main, [], Math.min(7, policy!.main.reduce((sum, line) => sum + line.quantity, 0)), 'first', 5, 512, policy!.progression));
  return {
    status: 'ready' as const,
    points: [3, 5].map(turn => ({
      turn, before: forecasts[0][turn - 1], after: forecasts[1][turn - 1],
      medianDelta: forecasts[1][turn - 1].seenRange.median - forecasts[0][turn - 1].seenRange.median,
    })),
    sources: [...new Set(policies.flatMap(policy => [...policy!.modeled]))].sort().map(name => ({
      name,
      before: [...decks[0].main, ...decks[0].material].filter(line => line.name === name).reduce((sum, line) => sum + line.quantity, 0),
      after: [...decks[1].main, ...decks[1].material].filter(line => line.name === name).reduce((sum, line) => sum + line.quantity, 0),
    })),
  };
}
