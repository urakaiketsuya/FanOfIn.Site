import test from 'node:test';
import assert from 'node:assert/strict';
import { orderMatchups, type ExpectedMatchup } from '../src/features/analytics/expectedResultsPresentation';

const rows: ExpectedMatchup[] = [
  { champion: 'Rai', card: 'Rai', score: .7, share: .1 },
  { champion: 'Tonoris', card: 'Tonoris', score: .4, share: .5 },
  { champion: 'Diao', card: 'Diao', score: .4, share: .2 },
  { champion: 'Allen', card: 'Allen', score: .4, share: .2 },
];
const names = (values: ExpectedMatchup[]) => values.map(row => row.champion);
test('matchup order answers prevalence and score questions separately with deterministic ties', () => {
  assert.deepEqual(names(orderMatchups(rows, 'common')), ['Tonoris', 'Allen', 'Diao', 'Rai']);
  assert.deepEqual(names(orderMatchups(rows, 'lowest')), ['Tonoris', 'Allen', 'Diao', 'Rai']);
  assert.deepEqual(names(orderMatchups(rows, 'highest')), ['Rai', 'Tonoris', 'Allen', 'Diao']);
});
test('sorting retains all forecasts and field shares without mutating the source', () => {
  const original = structuredClone(rows);
  for (const order of ['common', 'lowest', 'highest'] as const) {
    const sorted = orderMatchups(rows, order);
    assert.notEqual(sorted, rows);
    assert.deepEqual([...sorted].sort((a, b) => a.champion.localeCompare(b.champion)), [...original].sort((a, b) => a.champion.localeCompare(b.champion)));
  }
  assert.deepEqual(rows, original);
  assert.deepEqual(orderMatchups([], 'lowest'), []);
});
