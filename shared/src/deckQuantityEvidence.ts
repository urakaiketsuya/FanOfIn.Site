import { decodeCardLines, type ArchetypeCluster } from './analysis-types.js';
import { shortHash } from './hash.js';
import { deckBuildSignature } from './collected-decks.js';
import type { DeckDetailData } from './deckDetailData.js';
import type { DeckFormat, DeckLine } from './shoutatyourdecks-types.js';

export const MIN_QUANTITY_EVIDENCE_LISTS = 5;
export interface QuantityEvidenceRow { name: string; current: number; included: number; buckets: { quantity: number; lists: number }[] }
export interface BuildCohortList { signature: string; main: DeckLine[]; material: DeckLine[] }
export interface DeckBuildCohort {
  records: BuildCohortList[];
  conflicts: number;
  status: 'unsupported' | 'unmatched' | 'ambiguous' | 'loading' | 'sparse' | 'ready';
  cluster?: { id: string; name: string };
  champions: string[];
  lists: number;
  sightings: number;
  excluded: number;
  missing: number;
  period: { first: string; last: string } | null;
}
export interface DeckQuantityEvidence extends Omit<DeckBuildCohort, 'records' | 'conflicts'> { rows: QuantityEvidenceRow[] }
const counts = (lines: DeckLine[]) => {
  const result = new Map<string, number>();
  for (const line of lines) result.set(line.name, (result.get(line.name) ?? 0) + line.quantity);
  return result;
};
const valid = (lines: DeckLine[]) => lines.length > 0 && lines.every(line => typeof line.name === 'string' && line.name.length > 0 && Number.isSafeInteger(line.quantity) && line.quantity > 0);

/** Exact published membership only. Never substitute a champion-wide or guessed cohort. */
export function resolveDeckBuildCohort(target: { main: DeckLine[]; material: DeckLine[] }, format: DeckFormat | undefined, clusters: readonly ArchetypeCluster[], partitions: ReadonlyMap<string, DeckDetailData>): DeckBuildCohort {
  const base: DeckBuildCohort = { status: 'unmatched', champions: [], lists: 0, sightings: 0, excluded: 0, missing: 0, period: null, records: [], conflicts: 0 };
  if (format !== 'STANDARD') return { ...base, status: 'unsupported' };
  if (!valid(target.main) || !valid(target.material)) return base;
  const signature = deckBuildSignature(target.main, target.material);
  // Narrow decoding by the published identity hash, then verify full signatures below.
  // A collision cannot establish membership. Legacy partitions without hashes still work.
  const targetHash = shortHash(signature);
  const candidates = new Set<string>();
  for (const partition of partitions.values()) {
    const hashes = new Map(partition.popularity.entries.map(row => [row.deckId, row.deckHash]));
    for (const deck of partition.cards.decks) if (!hashes.get(deck.deckId) || hashes.get(deck.deckId) === targetHash) candidates.add(deck.deckId);
  }
  const eligible = new Set([...candidates, ...clusters.filter(cluster => cluster.deckIds.some(id => candidates.has(id))).flatMap(cluster => cluster.deckIds)]);
  const records = new Map<string, { signature: string; main: Map<string, number>; material: Map<string, number>; date?: string }>();
  for (const partition of partitions.values()) {
    const dates = new Map(partition.popularity.entries.map(row => [row.deckId, row.eventDate]));
    for (const deck of partition.cards.decks) {
      if (!eligible.has(deck.deckId) || records.has(deck.deckId)) continue;
      const main = decodeCardLines(deck.main, partition.cards.cardNames), material = decodeCardLines(deck.material, partition.cards.cardNames);
      if (!valid(main) || !valid(material)) continue;
      records.set(deck.deckId, { signature: deckBuildSignature(main, material), main: counts(main), material: counts(material), date: dates.get(deck.deckId) });
    }
  }
  const exactIds = new Set([...records].filter(([, row]) => row.signature === signature).map(([id]) => id));
  const matches = clusters.filter(cluster => cluster.deckIds.some(id => exactIds.has(id)));
  if (matches.length === 0) return base;
  if (matches.length > 1) return { ...base, status: 'ambiguous' };
  const cluster = matches[0];
  const champions = [...new Set([cluster.championName, ...cluster.championBreakdown.map(row => row.championName)])];
  const result = { ...base, cluster: { id: cluster.id, name: cluster.name }, champions };
  if (champions.some(name => !partitions.has(name))) return { ...result, status: 'loading' };
  const unique = new Map<string, BuildCohortList>();
  const allocations = new Map<string, string>();
  const conflicts = new Set<string>();
  const sectionKey = (main: Map<string, number>) => JSON.stringify([...main].sort(([a], [b]) => a.localeCompare(b)));
  const targetAllocation = sectionKey(counts(target.main));
  const dates: string[] = [];
  for (const id of new Set(cluster.deckIds)) {
    const row = records.get(id);
    if (!row) { result.missing++; continue; }
    const allocation = sectionKey(row.main);
    const previous = allocations.get(row.signature);
    if ((previous !== undefined && previous !== allocation) || (row.signature === signature && allocation !== targetAllocation)) conflicts.add(row.signature);
    allocations.set(row.signature, allocation);
    if (row.signature === signature) { result.excluded++; continue; }
    result.sightings++;
    unique.set(row.signature, { signature: row.signature,
      main: [...row.main].map(([name, quantity]) => ({ name, quantity })),
      material: [...row.material].map(([name, quantity]) => ({ name, quantity })),
    });
    if (row.date && Number.isFinite(Date.parse(row.date))) dates.push(row.date.slice(0, 10));
  }
  result.lists = unique.size;
  dates.sort();
  result.period = dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;
  result.conflicts = conflicts.size;
  if (conflicts.size) return { ...result, status: 'ambiguous' };
  result.records = [...unique.values()].sort((a, b) => a.signature.localeCompare(b.signature));
  return { ...result, status: unique.size < MIN_QUANTITY_EVIDENCE_LISTS ? 'sparse' : 'ready' };
}

/** Legacy Main-only presentation, backed by the same section-preserving reference cohort. */
export function deckQuantityEvidence(target: { main: DeckLine[]; material: DeckLine[] }, format: DeckFormat | undefined, clusters: readonly ArchetypeCluster[], partitions: ReadonlyMap<string, DeckDetailData>): DeckQuantityEvidence {
  return deckQuantityEvidenceFromCohort(target, resolveDeckBuildCohort(target, format, clusters, partitions));
}

/** Reuse an already resolved cohort when displaying composition and quantities together. */
export function deckQuantityEvidenceFromCohort(target: { main: DeckLine[] }, resolved: DeckBuildCohort): DeckQuantityEvidence {
  const { records, conflicts: _conflicts, ...cohort } = resolved;
  if (cohort.status !== 'ready') return { ...cohort, rows: [] };
  const mains = records.map(row => counts(row.main));
  const rows = [...counts(target.main)].map(([name, current]) => {
    const buckets = new Map<number, number>();
    for (const main of mains) { const quantity = main.get(name) ?? 0; buckets.set(quantity, (buckets.get(quantity) ?? 0) + 1); }
    return { name, current, included: records.length - (buckets.get(0) ?? 0), buckets: [...buckets].sort((a, b) => a[0] - b[0]).map(([quantity, lists]) => ({ quantity, lists })) };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return { ...cohort, rows };
}
