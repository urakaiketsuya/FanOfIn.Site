import type { Card } from './api-types.js';
import { calculateCardScenarios, defaultCardScenario } from './cardScenarios.js';
import { REPORT_DRAW_CHECKPOINTS } from './analyticsReport.js';
import { aggregateLines, copies, fixtureAccess, type AnalyticsDeck, type AnalyticsLine } from './fixtureResources.js';

/** Exact hypergeometric quantiles of physical sources drawn, not effects resolved. */
export function sourceCountRange(size: number, hits: number, seen: number) {
  size = Math.max(0, Math.floor(size)); hits = Math.max(0, Math.min(size, Math.floor(hits))); seen = Math.max(0, Math.min(size, Math.floor(seen)));
  let distribution = [1];
  for (let drawn = 0; drawn < seen; drawn++) {
    const next = Array(distribution.length + 1).fill(0) as number[];
    distribution.forEach((p, found) => {
      if (!p) return;
      const hit = Math.max(0, Math.min(1, (hits - found) / (size - drawn)));
      next[found] += p * (1 - hit); next[found + 1] += p * hit;
    });
    distribution = next;
  }
  const quantile = (threshold: number) => {
    let cumulative = 0;
    for (let i = 0; i < distribution.length; i++) { cumulative += distribution[i]; if (cumulative + 1e-12 >= threshold) return i; }
    return distribution.length - 1;
  };
  return { low: quantile(.1), median: quantile(.5), high: quantile(.9) };
}
const LABELS = { tokens: 'Token producers', prevention: 'Damage prevention', recovery: 'Recovery', draw: 'Extra draw sources', resources: 'Cost & payment support' } as const;
export type EffectAccessRow = { id: keyof typeof LABELS; label: string; lines: AnalyticsLine[]; material: AnalyticsLine[]; points: { seen: number; access: number; low: number; median: number; high: number }[] };
/** Reviewed effect families; cards can belong to multiple rows, never summed across rows. */
export function effectAccessReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const main = aggregateLines(deck.main), material = aggregateLines(deck.material);
  const champion = material.map(line => catalog.get(line.name)).filter(card => card?.types.includes('CHAMPION')).sort((a, b) => (b?.level ?? 0) - (a?.level ?? 0))[0];
  const rows = calculateCardScenarios({ main, material }, catalog, { ...defaultCardScenario(), classes: champion?.classes ?? [], level: champion?.level ?? 0 });
  const pools = Object.fromEntries(Object.keys(LABELS).map(key => [key, new Set<string>()])) as Record<keyof typeof LABELS, Set<string>>;
  for (const row of rows) {
    const key = row.unit.startsWith('recovered') ? 'recovery' : row.unit === 'prevented' ? 'prevention' : row.unit.startsWith('drawn') ? 'draw' : row.group === 'resources' ? 'resources' : null;
    if (key) for (const line of row.id === 'floating' ? row.support ?? [] : row.lines) pools[key].add(line.name);
  }
  // Reviewed catalog summon clauses. Trigger/entry conditions remain on the card.
  for (const name of ['Atmos Armor Type-Ares', 'Automata Genesis', 'Cordelia, Aurous Kaiser', 'Epicurean Institute']) pools.tokens.add(name);
  const size = Math.max(60, copies(main));
  return { size, unavailable: [...main, ...material].some(line => !catalog.has(line.name)), rows: (Object.keys(LABELS) as (keyof typeof LABELS)[]).flatMap(id => {
    const lines = main.filter(line => pools[id].has(line.name) && catalog.has(line.name));
    const regalia = material.filter(line => pools[id].has(line.name) && catalog.has(line.name));
    if (!lines.length && !regalia.length) return [];
    return [{ id, label: LABELS[id], lines, material: regalia, points: REPORT_DRAW_CHECKPOINTS.map(seen => ({ seen, access: fixtureAccess(size, copies(lines), seen), ...sourceCountRange(size, copies(lines), seen) })) }];
  }) as EffectAccessRow[] };
}
