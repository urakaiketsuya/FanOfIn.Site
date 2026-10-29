import assert from 'node:assert/strict';
import test from 'node:test';
import { deckQuantityEvidence, resolveDeckBuildCohort, deckBuildComparison, type Card, deckBuildSignature, shortHash, type ArchetypeCluster, type DeckDetailData } from '@gatcg/shared';
const target = { main: [{ name: 'A', quantity: 3 }, { name: 'Filler', quantity: 57 }], material: [{ name: 'Champion', quantity: 1 }] };
const makePartition = (): DeckDetailData => ({ generatedAt: '2026-10-29', cards: { generatedAt: '2026-10-29', cardNames: ['A', 'Filler', 'Champion', 'Sideboard'], decks: [
  { deckId: 'target', main: [[0, 3], [1, 57]], material: [[2, 1]], sideboard: [] },
  { deckId: 'target-repeat', main: [[1, 57], [0, 1], [0, 2]], material: [[2, 1]], sideboard: [[3, 4]] },
  ...[0, 1, 2, 4, 5].map((qty, index) => ({ deckId: `other-${index}`, main: [...(qty ? [[0, qty] as [number, number]] : []), [1, 60 - qty] as [number, number]], material: [[2, 1] as [number, number]], sideboard: [] })),
  { deckId: 'repeat', main: [[0, 2], [1, 58]], material: [[2, 1]], sideboard: [[3, 10]] },
]}, popularity: { generatedAt: '2026-10-29', entries: [] } });
const cluster = (ids: string[], championName = 'Champion') => ({ id: 'build', name: 'Published build', championName, championBreakdown: [{ championName }], deckIds: ids }) as ArchetypeCluster;
const fixture = () => { const partition = makePartition(); return { partitions: new Map([['Champion', partition]]), clusters: [cluster(partition.cards.decks.map(row => row.deckId))] }; };
test('uses exact published membership, excludes all target sightings, deduplicates builds and retains zero copies', () => {
  const { partitions, clusters } = fixture();
  const result = deckQuantityEvidence(target, 'STANDARD', clusters, partitions);
  assert.equal(result.status, 'ready'); assert.equal(result.lists, 5); assert.equal(result.sightings, 6); assert.equal(result.excluded, 2);
  assert.deepEqual(result.rows.find(row => row.name === 'A'), { name: 'A', current: 3, included: 4, buckets: [0, 1, 2, 4, 5].map(quantity => ({ quantity, lists: 1 })) });
  for (const row of result.rows) assert.equal(row.buckets.reduce((n, bucket) => n + bucket.lists, 0), result.lists);
});
test('never substitutes another format, similar list, or conflicting build assignment', () => {
  const { partitions, clusters } = fixture();
  assert.equal(deckQuantityEvidence(target, 'PANTHEON', clusters, partitions).status, 'unsupported');
  assert.equal(deckQuantityEvidence(target, undefined, clusters, partitions).status, 'unsupported');
  assert.equal(deckQuantityEvidence({ ...target, main: [{ name: 'A', quantity: 6 }] }, 'STANDARD', clusters, partitions).status, 'unmatched');
  assert.equal(deckQuantityEvidence(target, 'STANDARD', [...clusters, { ...clusters[0], id: 'conflict' }], partitions).status, 'ambiguous');
});
test('waits for all champion partitions, gates sparse data, and counts missing or invalid records', () => {
  const { partitions, clusters } = fixture();
  assert.equal(deckQuantityEvidence(target, 'STANDARD', [{ ...clusters[0], championBreakdown: [{ championName: 'Other' }] } as ArchetypeCluster], partitions).status, 'loading');
  const partition = partitions.get('Champion')!;
  partition.cards.decks[2].main = [[999, 60]];
  clusters[0].deckIds.push('missing');
  const result = deckQuantityEvidence(target, 'STANDARD', clusters, partitions);
  assert.equal(result.status, 'sparse'); assert.equal(result.missing, 2); assert.equal(result.lists, 4); assert.deepEqual(result.rows, []);
});
test('repeated partition records and duplicate membership IDs do not change results', () => {
  const { partitions, clusters } = fixture();
  const before = deckQuantityEvidence(target, 'STANDARD', clusters, partitions);
  partitions.set('Other', partitions.get('Champion')!); clusters[0].deckIds.push('other-0');
  assert.deepEqual(deckQuantityEvidence(target, 'STANDARD', clusters, partitions), before);
});
test('hash narrowing verifies the complete signature before assigning a build', () => {
  const { partitions, clusters } = fixture();
  const partition = partitions.get('Champion')!;
  // Simulate stale/colliding identity hashes: the signature remains authoritative.
  partition.cards.decks = partition.cards.decks.filter(row => !row.deckId.startsWith('target'));
  partition.popularity.entries = partition.cards.decks.map(row => ({ deckId: row.deckId, deckHash: shortHash(deckBuildSignature(target.main, target.material)) })) as DeckDetailData['popularity']['entries'];
  assert.equal(deckQuantityEvidence(target, 'STANDARD', clusters, partitions).status, 'unmatched');
});

const catalog = () => new Map(['A', 'Filler', 'Champion'].map(name => [name, {
  name, types: [name === 'Champion' ? 'CHAMPION' : 'ACTION'], elements: ['NORM'], subtypes: [],
  cost_reserve: name === 'A' ? 0 : null, cost_memory: name === 'Champion' ? 1 : -1, effect: '',
} as unknown as Card]));
test('section comparison preserves exact identities, zero-inclusive quantities and printed cost categories', () => {
  const { partitions, clusters } = fixture();
  const cohort = resolveDeckBuildCohort(target, 'STANDARD', clusters, partitions);
  const report = deckBuildComparison(target, cohort, catalog());
  const [main, material] = report.sections;
  assert.equal(report.excluded, 2);
  assert.deepEqual(main.cards.find(row => row.name === 'A')?.reference, { mean: 2.4, median: 2, low: 1, high: 4, count: 5 });
  assert.equal(main.cards.find(row => row.name === 'A')?.included, 4);
  assert.equal(main.metrics.find(row => row.group === 'size')?.reference?.median, 60);
  assert.deepEqual(main.metrics.filter(row => row.group === 'reserve').map(row => row.label), ['—', '0']);
  assert.equal(main.metrics.find(row => row.group === 'memory' && row.label === 'X')?.reference?.median, 60);
  assert.deepEqual(material.cards.map(row => row.name), ['Champion']);
  assert.equal(material.metrics.find(row => row.group === 'progression' && row.label === '1')?.reference?.median, 1);
  assert.ok(report.sections.every(section => section.cards.every(row => row.name !== 'Sideboard')));
});
test('reference-only cards retain zero current copies and section-specific denominators', () => {
  const { partitions, clusters } = fixture();
  const partition = partitions.get('Champion')!;
  partition.cards.cardNames.push('Other material');
  partition.cards.decks.find(row => row.deckId === 'other-0')!.material.push([4, 1]);
  const report = deckBuildComparison(target, resolveDeckBuildCohort(target, 'STANDARD', clusters, partitions), catalog());
  const row = report.sections[1].cards.find(row => row.name === 'Other material')!;
  assert.equal(row.current, 0); assert.equal(row.included, 1); assert.equal(row.lists, 5);
  assert.equal(row.reference?.mean, .2); assert.equal(row.reference?.median, 0);
  assert.equal(report.sections[0].complete, 5); assert.equal(report.sections[1].complete, 4);
  assert.equal(report.sections[1].metrics.find(row => row.group === 'progression')?.reference, null);
  assert.equal(report.sections[1].metrics[0].reference?.count, 5);
});
test('unknown target catalog blocks derived comparisons without erasing structural sizes or copy counts', () => {
  const { partitions, clusters } = fixture();
  const cards = catalog(); cards.delete('A');
  const report = deckBuildComparison(target, resolveDeckBuildCohort(target, 'STANDARD', clusters, partitions), cards);
  assert.equal(report.sections[0].unresolved, 3);
  assert.ok(report.sections[0].metrics.filter(row => row.group !== 'size').every(row => row.reference === null));
  assert.equal(report.sections[0].metrics[0].reference?.median, 60);
  assert.equal(report.sections[0].cards.find(row => row.name === 'A')?.reference?.median, 2);
  assert.equal(report.sections[1].complete, 5);
});
test('sparse and unsupported cohorts do not produce zero-valued reference distributions', () => {
  const { partitions, clusters } = fixture();
  clusters[0].deckIds = ['target', 'other-0'];
  for (const format of ['STANDARD', 'PANTHEON'] as const) {
    const report = deckBuildComparison(target, resolveDeckBuildCohort(target, format, clusters, partitions), catalog());
    assert.ok(report.sections.every(section => section.metrics.every(row => row.reference === null) && section.cards.every(row => row.reference === null)));
  }
});
test('conflicting section allocation cannot select an arbitrary representative', () => {
  const { partitions, clusters } = fixture();
  const repeat = partitions.get('Champion')!.cards.decks.find(row => row.deckId === 'repeat')!;
  repeat.main = [[0, 1], [1, 58]]; repeat.material = [[2, 1], [0, 1]];
  const cohort = resolveDeckBuildCohort(target, 'STANDARD', clusters, partitions);
  assert.equal(cohort.status, 'ambiguous'); assert.equal(cohort.conflicts, 1); assert.deepEqual(cohort.records, []);
  assert.deepEqual(deckQuantityEvidence(target, 'STANDARD', clusters, partitions).rows, []);
  assert.ok(deckBuildComparison(target, cohort, catalog()).sections.every(section => section.metrics.every(row => row.reference === null)));
});
