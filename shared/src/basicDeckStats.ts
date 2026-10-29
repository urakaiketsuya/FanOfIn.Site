import type { Card } from './api-types.js';
import type { OmnidexDecklistCardLine } from './omnidex-types.js';
import { computeKeywordComposition } from './keywords.js';

export interface BasicStatRow {
  label: string;
  count: number;
  percent: number;
  lines: { name: string; quantity: number; detail?: string }[];
}
/** One exact section; membership and totals share the same copy-weighted source.
 * Composition scope omits subtypes, copy groups, keywords and Floating Memory. */
export function basicDeckStats(input: OmnidexDecklistCardLine[], catalog: Map<string, Card>, scope: 'all' | 'composition' = 'all') {
  const quantities = new Map<string, number>();
  for (const line of input) if (line.quantity > 0) quantities.set(line.card, (quantities.get(line.card) ?? 0) + line.quantity);
  const lines = [...quantities].map(([name, quantity]) => ({ name, quantity }));
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const group = (labels: (card: Card | undefined, name: string, quantity: number) => string[]) => {
    const rows = new Map<string, BasicStatRow>();
    for (const line of lines) for (const label of new Set(labels(catalog.get(line.name), line.name, line.quantity))) {
      const row = rows.get(label) ?? { label, count: 0, percent: 0, lines: [] };
      row.count += line.quantity;
      row.lines.push(line);
      row.percent = total ? row.count / total * 100 : 0;
      rows.set(label, row);
    }
    return [...rows.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  const costs = (field: 'cost_memory' | 'cost_reserve', champions: boolean) => group(card => {
    if (!card) return champions ? [] : ['Unknown'];
    if (card.types.includes('CHAMPION') !== champions) return [];
    const value = card[field];
    return value == null ? ['—'] : [value < 0 ? 'X' : String(value)];
  }).sort((a, b) => {
    const rank = (s: string) => /^\d+$/.test(s) ? Number(s) : s === 'X' ? 1000 : s === '—' ? 1001 : 1002;
    return rank(a.label) - rank(b.label);
  });
  const floating = scope === 'composition' ? [] : group(card => {
    if (!card?.effect) return [];
    return [...card.effect.matchAll(/(?:\[([^\]]+)\]\s*)?\*\*Floating Memory\*\*/g)].map(match => match[1] ? `Conditional · ${match[1]}` : 'Base');
  });
  return {
    total, unique: lines.length,
    unresolved: lines.filter(line => !catalog.has(line.name)).reduce((sum, line) => sum + line.quantity, 0),
    types: group(card => card ? card.types : ['Unknown']),
    elements: group(card => card ? card.elements : ['Unknown']),
    subtypes: scope === 'composition' ? [] : group(card => card ? card.subtypes : ['Unknown']),
    copies: scope === 'composition' ? [] : group((_card, _name, quantity) => [`${quantity}× per card`]),
    keywords: scope === 'composition' ? [] : group((card, name) => card ? [...computeKeywordComposition([{ name, quantity: 1 }], catalog).keys()] : ['Unknown']),
    floating, reserve: costs('cost_reserve', false), memory: costs('cost_memory', false),
    progression: costs('cost_memory', true),
  };
}
