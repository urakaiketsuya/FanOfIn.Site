import type { Card } from './api-types.js';
import { decodeCardLines, type DeckCardIndexData } from './analysis-types.js';
import { drawAccessReport, REPORT_DRAW_CHECKPOINTS } from './analyticsReport.js';

export interface ReportDistribution { mean: number; median: number; low: number; high: number; count: number }
/** Linear-interpolated quartiles; the interval describes lists, not confidence in the mean. */
export function reportDistribution(values: number[]): ReportDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = (p: number) => {
    const index = (sorted.length - 1) * p, left = Math.floor(index);
    return sorted.length ? sorted[left] + (sorted[Math.ceil(index)] - sorted[left]) * (index - left) : 0;
  };
  return { mean: values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0, median: quantile(.5), low: quantile(.25), high: quantile(.75), count: values.length };
}

/** One observation per published tournament sighting, scoped to this build, Main + Material only. */
export function archetypeReport(deckIds: readonly string[], partitions: readonly DeckCardIndexData[], catalog: ReadonlyMap<string, Card>) {
  const membership = new Set(deckIds);
  const decks = new Map<string, { main: Map<string, number>; material: Map<string, number> }>();
  for (const partition of partitions) for (const deck of partition.decks) {
    if (!membership.has(deck.deckId) || decks.has(deck.deckId)) continue;
    const section = (encoded: typeof deck.main) => {
      const result = new Map<string, number>();
      for (const line of decodeCardLines(encoded, partition.cardNames)) if (line.name && line.quantity > 0) result.set(line.name, (result.get(line.name) ?? 0) + line.quantity);
      return result;
    };
    const main = section(deck.main);
    if (main.size) decks.set(deck.deckId, { main, material: section(deck.material) });
  }
  const lists = [...decks.values()];
  const sum = (values: Map<string, number>) => [...values.values()].reduce((a, b) => a + b, 0);
  const missingNames = [...new Set(lists.flatMap(deck => [...deck.main.keys(), ...deck.material.keys()]).filter(name => !catalog.has(name)))].sort();
  const complete = lists.filter(deck => [...deck.main.keys()].every(name => catalog.has(name)));
  const metrics = complete.map(deck => {
    const counts = new Map<string, number>();
    const add = (key: string, n: number) => counts.set(key, (counts.get(key) ?? 0) + n);
    for (const [name, quantity] of deck.main) {
      const card = catalog.get(name)!;
      for (const type of new Set(card.types)) add(`Type · ${type}`, quantity);
      for (const element of new Set(card.elements)) add(`Element · ${element}`, quantity);
      add(`Reserve · ${card.cost_reserve == null ? 'No fixed cost' : card.cost_reserve >= 8 ? '8+' : card.cost_reserve}`, quantity);
      if (/\*\*Floating Memory\*\*/i.test(card.effect ?? '')) add('Printed Floating Memory', quantity);
    }
    return counts;
  });
  const keys = [...new Set(metrics.flatMap(m => [...m.keys()]))];
  if (complete.length && !keys.includes('Printed Floating Memory')) keys.push('Printed Floating Memory');
  const composition = keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(label => ({ label, ...reportDistribution(metrics.map(m => m.get(label) ?? 0)) }));
  const access = lists.map(deck => new Map(drawAccessReport([...deck.main].map(([name, quantity]) => ({ name, quantity }))).rows.map(row => [row.name, row.points])));
  const cards = (['main', 'material'] as const).flatMap(section => [...new Set(lists.flatMap(deck => [...deck[section].keys()]))].map(name => {
    const played = lists.map(deck => deck[section].get(name) ?? 0).filter(n => n > 0);
    return { name, section, inclusion: played.length / lists.length, lists: played.length, copies: reportDistribution(played),
      access: section === 'main' ? REPORT_DRAW_CHECKPOINTS.map((seen, i) => ({ seen, ...reportDistribution(access.map(rows => rows.get(name)?.[i].probability ?? 0)) })) : [],
    };
  })).sort((a, b) => b.inclusion - a.inclusion || a.name.localeCompare(b.name));
  return { requested: membership.size, listed: lists.length, complete: complete.length, missingNames,
    mainSize: reportDistribution(lists.map(deck => sum(deck.main))), materialSize: reportDistribution(lists.map(deck => sum(deck.material))), composition, cards };
}
