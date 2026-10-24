import { PUBLISHED_PACKAGE_CATALOG, type PackageRequirement, type PublishedCardPackage } from './publishedPackages.js';

export interface ReportLine { name: string; quantity: number }
export interface ReportDeck { main: readonly ReportLine[]; material: readonly ReportLine[] }
export const PACKAGE_ACCESS_CHECKPOINTS = [7, 10, 15, 20] as const;
export function reportCounts(lines: readonly ReportLine[]) {
  const counts = new Map<string, number>();
  for (const line of lines) if (Number.isSafeInteger(line.quantity) && line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  return counts;
}
export function reportAccess(size: number, copies: number, seen: number) {
  if (size <= 0 || copies <= 0) return 0;
  let missing = 1;
  for (let i = 0; i < Math.min(size, seen); i++) missing *= Math.max(0, size - copies - i) / (size - i);
  return 1 - missing;
}

/** Exact joint presence distribution. Subset inversion handles overlapping groups without independence assumptions. */
export function packageAccessOutcomes(deck: ReportDeck, anchor: readonly PackageRequirement[], support: readonly PackageRequirement[], seen: number) {
  const main = reportCounts(deck.main), material = reportCounts(deck.material);
  const size = [...main.values()].reduce((a, b) => a + b, 0);
  const names = [...new Set([...anchor, ...support].filter(r => r.section === 'main').flatMap(r => [...r.cards]))];
  if (names.length > 16) throw new Error('Package access supports at most 16 distinct Main names.');
  const n = 2 ** names.length;
  const probabilities = new Float64Array(n);
  for (let mask = 0; mask < n; mask++) {
    const absent = names.reduce((sum, name, i) => sum + ((mask & (1 << i)) ? 0 : main.get(name) ?? 0), 0);
    probabilities[mask] = 1 - reportAccess(size, absent, seen);
  }
  for (let bit = 0; bit < names.length; bit++) for (let mask = 0; mask < n; mask++) if (mask & (1 << bit)) probabilities[mask] -= probabilities[mask ^ (1 << bit)];
  const meets = (requirements: readonly PackageRequirement[], mask: number) => requirements.every(r =>
    new Set(r.cards.filter(name => r.section === 'material' ? (material.get(name) ?? 0) > 0 : !!(mask & (1 << names.indexOf(name))))).size >= r.minimum);
  const result = { both: 0, anchorOnly: 0, supportOnly: 0, neither: 0 };
  for (let mask = 0; mask < n; mask++) {
    const a = meets(anchor, mask), b = meets(support, mask);
    result[a ? b ? 'both' : 'anchorOnly' : b ? 'supportOnly' : 'neither'] += Math.max(0, probabilities[mask]);
  }
  return { seen: Math.min(size, seen), ...result };
}

export function packageReport(deck: ReportDeck, definitions: readonly PublishedCardPackage[] = PUBLISHED_PACKAGE_CATALOG.packages) {
  const main = reportCounts(deck.main), material = reportCounts(deck.material);
  return definitions.filter(def => def.requirements.some(r => r.cards.some(name => (r.section === 'main' ? main : material).has(name)))).map(def => {
    const first = def.requirements[0];
    // A material-only multi-member requirement still has a meaningful source/support split.
    const split = def.requirements.length === 1 && first.cards.length > 1;
    const anchor = split ? [{ ...first, cards: [first.cards[0]], minimum: 1 }] : [first];
    const support = split ? [{ ...first, cards: first.cards.slice(1), minimum: first.minimum - 1 }] : def.requirements.slice(1);
    const lineage = !def.materialChampionPrefix || [...material.keys()].some(name => name.startsWith(def.materialChampionPrefix!));
    const requirementsMet = lineage && def.requirements.every(r => r.cards.filter(name => (r.section === 'main' ? main : material).has(name)).length >= r.minimum);
    return { definition: def, anchor, support, lineage, requirementsMet, checkpoints: PACKAGE_ACCESS_CHECKPOINTS.map(seen => packageAccessOutcomes(deck, anchor, support, seen)) };
  });
}
