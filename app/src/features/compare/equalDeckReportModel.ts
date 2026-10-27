import { aggregateLines, fixtureAccess, type OmnidexDecklist } from '@gatcg/shared';

export function sectionCounts(lines: OmnidexDecklist['main']) {
  return new Map(aggregateLines(lines.map(line => ({ name: line.card, quantity: line.quantity }))).map(line => [line.name, line.quantity]));
}

/** Missing lists and empty libraries must not be presented as zero probability. */
export function reportAccess(main: ReadonlyMap<string, number> | null, name: string, seen: number): number | null {
  if (!main) return null;
  const size = [...main.values()].reduce((sum, value) => sum + value, 0);
  return size ? fixtureAccess(size, main.get(name) ?? 0, seen) * 100 : null;
}

export function pairMembership(first: ReadonlyMap<string, number>, second: ReadonlyMap<string, number>) {
  return [...new Set([...first.keys(), ...second.keys()])].sort().map(name => {
    const a = first.get(name) ?? 0, b = second.get(name) ?? 0;
    return { name, first: a, second: b, group: !a || !b ? 'Distinctive cards' : a === b ? 'Shared core' : 'Different quantities' };
  });
}
