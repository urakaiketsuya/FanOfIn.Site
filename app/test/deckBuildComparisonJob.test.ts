import assert from 'node:assert/strict';
import test from 'node:test';
import { deckBuildComparison, resolveDeckBuildCohort, type ArchetypeCluster, type Card, type DeckDetailData } from '@gatcg/shared';
import { runBuildComparison, type BuildComparisonInput } from '../src/features/decks/deckBuildComparisonJob';

function fixture(): BuildComparisonInput {
  const target = { main: [{ name: 'A', quantity: 3 }], material: [{ name: 'Champion', quantity: 1 }] };
  const decks = [3, 1, 2, 4, 5, 6, 3].map((qty, i) => ({ deckId: String(i), main: [[0, qty]], material: [[1, 1]], sideboard: [] }));
  return { target,
    clusters: [{ id: 'build', name: 'Build', championName: 'Champion', championBreakdown: [], deckIds: decks.map(row => row.deckId) } as unknown as ArchetypeCluster],
    partitions: new Map([['Champion', { cards: { cardNames: ['A', 'Champion'], decks }, popularity: { entries: [] } } as unknown as DeckDetailData]]),
    cards: new Map(['A', 'Champion'].map(name => [name, { name, types: [name === 'A' ? 'ACTION' : 'CHAMPION'], elements: ['NORM'], subtypes: [], effect: '' } as Card])),
  };
}
test('worker payload preserves exact reference results across structured cloning', () => {
  const input = fixture();
  const cohort = resolveDeckBuildCohort(input.target, 'STANDARD', input.clusters, input.partitions);
  const { records: _, ...coverage } = cohort;
  const actual = structuredClone(runBuildComparison(structuredClone(input)));
  assert.deepEqual(actual, { report: coverage, comparison: deckBuildComparison(input.target, cohort, input.cards) });
  assert.equal(actual.report.excluded, 2);
  assert.equal(actual.report.lists, 5);
  assert.equal('records' in actual.report, false);
});
test('worker entry point returns a result and reports malformed-input failures', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const messages: unknown[] = [];
  const port = { onmessage: (_event: unknown) => {}, postMessage: (message: unknown) => messages.push(message) };
  Object.defineProperty(globalThis, 'self', { configurable: true, value: port });
  try {
    await import('../src/features/decks/deckBuildComparison.worker');
    port.onmessage({ data: fixture() });
    assert.deepEqual(messages[0], { result: runBuildComparison(fixture()) });
    port.onmessage({ data: null });
    assert.deepEqual(messages[1], { error: 'Comparison could not run. Try again.' });
  } finally {
    if (original) Object.defineProperty(globalThis, 'self', original);
    else Reflect.deleteProperty(globalThis, 'self');
  }
});

test('reference-only catalog cards restore composition coverage without changing the cohort', () => {
  const input = fixture();
  const partition = input.partitions.get('Champion')!;
  partition.cards.cardNames.push('Reference only');
  for (const deck of partition.cards.decks) if (deck.main[0][1] !== 3) deck.main.push([2, 1]);
  const incomplete = runBuildComparison(input);
  assert.equal(incomplete.comparison.sections[0].complete, 0);
  assert.equal(incomplete.comparison.sections[0].metrics.find(row => row.group === 'types')?.reference, null);
  input.cards.set('Reference only', { ...input.cards.get('A')!, name: 'Reference only', types: ['ALLY'] });
  const complete = runBuildComparison(input);
  assert.deepEqual(complete.report, incomplete.report);
  assert.equal(complete.comparison.sections[0].complete, 5);
  assert.equal(complete.comparison.sections[0].metrics.find(row => row.group === 'types' && row.label === 'ALLY')?.reference?.median, 1);
  assert.equal(complete.comparison.sections[0].cards.find(row => row.name === 'Reference only')?.current, 0);
  assert.deepEqual(complete.comparison.sections[0].cards, incomplete.comparison.sections[0].cards);
});
