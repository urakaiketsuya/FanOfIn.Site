import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reconcileMerchandise } from '../reconcile-official-merchandise.mjs';
const source = JSON.parse(await readFile(new URL('../../../docs/research/official-merchandise-sources.json', import.meta.url), 'utf8'));

test('accounts for every verified observation exactly once and excludes generic categories', () => {
  const result = reconcileMerchandise(source);
  const expected = source.sources.flatMap((s) => s.groups.flatMap((g) => g.sourceLabels.map((label) => `${s.id}|${g.page}|${g.productType}|${label}`))).sort();
  const actual = result.candidates.flatMap((c) => c.observations.map((o) => `${o.sourceId}|${o.page}|${c.productType}|${o.sourceLabel}`))
    .concat(result.excludedObservations.map((o) => `${o.sourceId}|${o.page}|${o.productType}|${o.sourceLabel}`)).sort();
  assert.deepEqual(actual, expected);
  assert.equal(result.counts.observations, 194);
  assert.deepEqual(result.excludedObservations.map((o) => o.sourceLabel).sort(), ['Dragon Shield Sleeves', 'Posters']);
});

test('keeps ambiguous artwork and product types separate, but reconciles explicit CUR punctuation', () => {
  const result = reconcileMerchandise(source);
  const phantom = result.candidates.filter((c) => c.productType === 'playmat' && c.label.startsWith('Alice, Phantom Monarch'));
  assert.equal(phantom.length, 3);
  assert.equal(phantom.find((c) => c.label.endsWith(' CUR')).observations.length, 2);
  assert.deepEqual(result.candidates.filter((c) => c.label === 'Silvie').map((c) => c.productType).sort(),
    ['acrylic-standee', 'figurine', 'plush', 't-shirt']);
  assert.equal(result.candidates.filter((c) => c.label.startsWith('Baby Gr')).length, 2);
  for (const review of result.identityReviews) {
    assert(review.candidateIds.every((id) => result.candidates.some((c) => c.id === id)));
  }
});

test('candidate IDs and evidence ordering survive source reordering', () => {
  const reordered = structuredClone(source);
  reordered.sources.reverse();
  for (const s of reordered.sources) s.groups.reverse();
  assert.deepEqual(reconcileMerchandise(reordered).candidates, reconcileMerchandise(source).candidates);
});

test('rejects duplicate sources and unverified evidence', () => {
  const duplicate = structuredClone(source);
  duplicate.sources.push(duplicate.sources[0]);
  assert.throws(() => reconcileMerchandise(duplicate), /Duplicate source/);
  const unverified = structuredClone(source);
  unverified.sources[0].verification = 'text-only';
  assert.throws(() => reconcileMerchandise(unverified));
});
