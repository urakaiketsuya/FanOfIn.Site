import type { Card } from './api-types.js';
import type { AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawAndDamageInfluence } from './drawInfluence.js';

/** Paid Fireball output to a target unit, before responses/prevention. Not total deck damage. */
export function computeRaiDamageReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  if ([...deck.main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return { status: 'missing' as const };
  const counts = new Map<string, number>();
  for (const line of deck.main) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const main = [...counts].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
  const policy = createRaiDrawPolicy(main, deck.material, catalog);
  if (!policy) return { status: 'unsupported' as const };
  const fireEnabled = deck.material.some(line => line.quantity > 0 && line.name === 'Spirit of Fire');
  const sources = policy.main.map(source => fireEnabled && source.name === 'Fireball'
    ? { ...source, mechanic: 'fireball' as const } : source);
  if (sources.some(source => source.mechanic === 'fireball' && source.reserve == null)) return { status: 'missing' as const };
  const points = estimateDrawAndDamageInfluence(sources, [], Math.min(7, main.reduce((sum, line) => sum + line.quantity, 0)), 'first', 5, 512, policy.progression);
  return {
    status: 'ready' as const,
    damageSources: sources.filter(source => source.mechanic === 'fireball').map(({ name, quantity }) => ({ name, quantity })),
    points: points.map((point, index) => ({ turn: index + 1, damage: point.paidDamageRange })),
  };
}

export function compareRaiDamageReports(before: AnalyticsDeck, after: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const baseline = computeRaiDamageReport(before, catalog), target = computeRaiDamageReport(after, catalog);
  if (baseline.status === 'missing' || target.status === 'missing') return { status: 'missing' as const };
  if (baseline.status !== 'ready' || target.status !== 'ready') return { status: 'unsupported' as const };
  return { status: 'ready' as const, sources: { before: baseline.damageSources, after: target.damageSources },
    points: [3, 5].map(turn => ({ turn, before: baseline.points[turn - 1].damage, after: target.points[turn - 1].damage })) };
}
