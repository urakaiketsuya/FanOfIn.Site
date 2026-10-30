/** Reproducible calculation-only benchmark; file I/O and parsing are excluded. */
import assert from 'node:assert/strict';
import { runBuildComparison } from '../app/src/features/decks/deckBuildComparisonJob.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { decodeCardLines, shortHash, resolveDeckBuildCohort, deckBuildComparison, type ArchetypeTaxonomyData, type DeckDetailData, type Card } from '../shared/src/index.js';
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));
const taxonomy = read<ArchetypeTaxonomyData>('data/analysis/archetype-taxonomy.json');
const catalog = new Map(read<{ cards: Card[] }>('data/card-catalog.json').cards.map(card => [card.name, card]));
for (const [buildId, targetId] of [['szgmmc', '21122:104'], ['e0ums8', null]] as const) {
  const cluster = taxonomy.clusters.find(row => row.id === buildId)!;
  const champions = [...new Set([cluster.championName, ...cluster.championBreakdown.map(row => row.championName)])];
  const partitions = new Map(champions.map(name => [name, read<DeckDetailData>(`data/analysis/champion-decks/${shortHash(name)}.json`)]));
  const source = [...partitions.values()].flatMap(partition => partition.cards.decks.map(deck => ({ deck, names: partition.cards.cardNames }))).find(({ deck }) => targetId ? deck.deckId === targetId : cluster.deckIds.includes(deck.deckId))!;
  const target = { main: decodeCardLines(source.deck.main, source.names), material: decodeCardLines(source.deck.material, source.names) };
  const cohort = resolveDeckBuildCohort(target, 'STANDARD', taxonomy.clusters, partitions);
  const { records: _records, ...coverage } = cohort;
  assert.deepEqual(structuredClone(runBuildComparison(structuredClone({ target, clusters: taxonomy.clusters, partitions, cards: catalog }))),
    { report: coverage, comparison: deckBuildComparison(target, cohort, catalog) });
  const runs = Array.from({ length: 5 }, () => {
    const start = performance.now();
    const cohort = resolveDeckBuildCohort(target, 'STANDARD', taxonomy.clusters, partitions);
    const resolved = performance.now();
    const comparison = deckBuildComparison(target, cohort, catalog);
    const end = performance.now();
    return { resolveMs: Math.round(resolved - start), projectMs: Math.round(end - resolved), lists: cohort.lists,
      digest: createHash('sha256').update(JSON.stringify({ cohort, comparison })).digest('hex') };
  });
  console.log(JSON.stringify({ buildId, targetId: source.deck.deckId, runs }));
}
