/** Read-only Release A audit. Run from the repository root with node --import tsx. */
import { readFileSync, statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { decodeCardLines, deckBuildSignature, reportDistribution, shortHash,
  type ArchetypeTaxonomyData, type Card, type DeckCardIndexData, type DeckDetailData, type DeckPopularityIndexData } from '../shared/src/index.js';

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const taxonomy = read<ArchetypeTaxonomyData>('data/analysis/archetype-taxonomy.json');
const index = read<DeckCardIndexData>('data/analysis/deck-card-index.json');
const catalog = read<{ cards: Card[] }>('data/card-catalog.json');
const names = new Set(catalog.cards.map(card => card.name));
const popularity = new Map(read<DeckPopularityIndexData>('data/analysis/deck-popularity-index.json').entries.map(row => [row.deckId, row]));
const cachedPartitions = new Map<string, { data: DeckDetailData; bytes: number }>();
const valid = (lines: { name: string; quantity: number }[]) => lines.length > 0 && lines.every(line => !!line.name && Number.isSafeInteger(line.quantity) && line.quantity > 0);
const start = performance.now();
const records = new Map(index.decks.map(deck => {
  const main = decodeCardLines(deck.main, index.cardNames), material = decodeCardLines(deck.material, index.cardNames);
  return [deck.deckId, { main, material, valid: valid(main) && valid(material),
    signature: deckBuildSignature(main, material),
    sections: JSON.stringify([deckBuildSignature(main, []), deckBuildSignature(material, [])]),
    complete: [...main, ...material].every(line => names.has(line.name)) }];
}));
const missingNames = [...new Set([...records.values()].flatMap(row => [...row.main, ...row.material]).filter(line => !names.has(line.name)).map(line => line.name))].sort();
const identities = new Map<string, Set<string>>();
const membership = new Map<string, Set<string>>();
for (const cluster of taxonomy.clusters) for (const id of new Set(cluster.deckIds)) {
  const row = records.get(id);
  if (!row?.valid) continue;
  const sections = identities.get(row.signature) ?? new Set<string>(); sections.add(row.sections); identities.set(row.signature, sections);
  const builds = membership.get(row.signature) ?? new Set<string>(); builds.add(cluster.id); membership.set(row.signature, builds);
}
const cohorts = taxonomy.clusters.map(cluster => {
  const ids = [...new Set(cluster.deckIds)], rows = ids.flatMap(id => records.get(id)?.valid ? [records.get(id)!] : []);
  const idSet = new Set(ids);
  const unique = new Map(rows.map(row => [row.signature, row]));
  const champions = [...new Set([cluster.championName, ...cluster.championBreakdown.map(row => row.championName)])];
  let bytes = 0;
  const partitionIds = new Set<string>();
  const dates: string[] = [];
  for (const name of champions) {
    const path = `data/analysis/champion-decks/${shortHash(name)}.json`;
    if (!cachedPartitions.has(path)) cachedPartitions.set(path, { data: read<DeckDetailData>(path), bytes: statSync(path).size });
    const { data: partition, bytes: size } = cachedPartitions.get(path)!;
    bytes += size;
    for (const deck of partition.cards.decks) partitionIds.add(deck.deckId);
    for (const entry of partition.popularity.entries) if (idSet.has(entry.deckId) && entry.eventDate && Number.isFinite(Date.parse(entry.eventDate))) dates.push(entry.eventDate.slice(0, 10));
  }
  dates.sort();
  return { id: cluster.id, name: cluster.name, assigned: ids.length, validSightings: rows.length,
    distinctLists: unique.size, completeDistinctLists: [...unique.values()].filter(row => row.complete).length,
    invalidOrMissing: ids.length - rows.length, absentFromPartitions: ids.filter(id => !partitionIds.has(id)).length,
    absentPopularity: ids.filter(id => !popularity.has(id)).length,
    otherChampion: ids.filter(id => popularity.has(id) && !champions.includes(popularity.get(id)!.championName ?? 'Unknown')).length,
    ambiguousSectionIdentities: [...unique.keys()].filter(key => identities.get(key)!.size > 1).length,
    champions: champions.length, partitionBytes: bytes, period: dates.length ? [dates[0], dates.at(-1)] : null,
    sightingMainSize: reportDistribution(rows.map(row => row.main.reduce((n, line) => n + line.quantity, 0))),
    distinctMainSize: reportDistribution([...unique.values()].map(row => row.main.reduce((n, line) => n + line.quantity, 0))) };
});
console.log(JSON.stringify({ generatedAt: taxonomy.generatedAt, recorded: records.size, builds: cohorts.length,
  invalidRecorded: [...records.values()].filter(row => !row.valid).length, missingNames,
  conflictingBuildIdentities: [...membership.values()].filter(builds => builds.size > 1).length,
  conflictingSectionIdentities: [...identities.values()].filter(sections => sections.size > 1).length,
  // Every target removes one identity; six before exclusion is the five-other-list minimum.
  buildsWithFiveOtherLists: cohorts.filter(row => row.distinctLists >= 6).length,
  multiChampionBuilds: cohorts.filter(row => row.champions > 1).length,
  assignedAbsentFromPartitions: cohorts.reduce((n, row) => n + row.absentFromPartitions, 0),
  assignedAbsentPopularity: cohorts.reduce((n, row) => n + row.absentPopularity, 0),
  assignedOtherChampion: cohorts.reduce((n, row) => n + row.otherChampion, 0),
  largest: [...cohorts].sort((a, b) => b.distinctLists - a.distinctLists).slice(0, 5),
  largestTransfer: [...cohorts].sort((a, b) => b.partitionBytes - a.partitionBytes).slice(0, 3),
  elapsedMs: Math.round(performance.now() - start) }, null, 2));
