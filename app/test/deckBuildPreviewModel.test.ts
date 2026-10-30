import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckBuildComparison, type BuildComparisonCard } from '@gatcg/shared';
import { deckBuildPreviewRows } from '../src/features/decks/deckBuildPreviewModel.ts';

const row = (name: string, current: number, median: number | null, included = 5): BuildComparisonCard => ({ name, current, included, lists: 8, reference: median === null ? null : { median, low: 0, high: 4, mean: median, count: 8 } });
const comparison = (main: BuildComparisonCard[], material: BuildComparisonCard[]): ReturnType<typeof deckBuildComparison> => ({ lists: 8, sections: [
  { section: 'main', cards: main, metrics: [], complete: 8, unresolved: 0 },
  { section: 'material', cards: material, metrics: [], complete: 8, unresolved: 0 },
] });

test('preview ranks both sections by absolute difference, includes absent cards and preserves reference values', () => {
  const input = comparison([row('Same', 4, 4), row('Absent', 0, 4), row('Extra', 3, 0), row('Unknown', 4, null)], [row('Extra', 1, 0), row('Material', 4, 0, 6)]);
  const before = structuredClone(input);
  const result = deckBuildPreviewRows(input);
  assert.deepEqual(result.map(r => [r.name, r.section, r.current, r.reference?.median]), [['Material', 'material', 4, 0], ['Absent', 'main', 0, 4], ['Extra', 'main', 3, 0]]);
  assert.equal(result[1].reference, input.sections[0].cards[1].reference);
  assert.deepEqual(input, before);
});

test('equal counts and unavailable references do not produce differences', () => {
  assert.deepEqual(deckBuildPreviewRows(comparison([row('Same', 1, 1), row('Missing', 4, null)], [])), []);
});
