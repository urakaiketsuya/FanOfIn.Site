import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildReviewQueue } from '../build-merchandise-review-queue.mjs';
const read = async name => JSON.parse(await readFile(new URL(`../../../docs/research/official-merchandise-${name}.json`, import.meta.url), 'utf8'));
const [candidates, promotions, visual, saved] = await Promise.all(['candidates', 'promotions', 'visual-review', 'review-queue'].map(read));

test('queue accounts for every observation without promoting repeated labels or visual matches', () => {
  const queue = buildReviewQueue(candidates, promotions, visual);
  assert.deepEqual(queue, saved);
  assert.equal(queue.counts.promotedObservations, 94);
  assert.equal(queue.counts.unpromotedLabelGroups, 54);
  assert.equal(queue.counts.observationsNeedingReview, 98);
  assert.equal(queue.counts.totalSourceObservations, 194);
  const merlin = queue.entries.find(entry => entry.label === "Merlin, Amethyst's Glow" && entry.productType === 'playmat');
  assert.equal(merlin.status, 'additional-appearances-need-review');
  assert.equal(merlin.observations.find(o => o.sourceId === 'los-angeles-2026').status, 'needs-review');
  const silvie = queue.entries.filter(entry => entry.label === 'Silvie' && entry.observations.some(o => o.sourceId === 'melbourne-2026' && o.status === 'promoted'));
  assert.equal(silvie.length, 2, 'Same caption on a plush and figure identifies separate products');
});

test('invalid or duplicated promotions cannot silently alter evidence accounting', () => {
  for (const change of [
    item => { item.candidateId = 'unknown'; },
    item => { item.page = 999; },
    item => { item.sourceLabel = 'Unknown'; },
  ]) {
    const invalid = structuredClone(promotions);
    change(invalid.items[0]);
    assert.throws(() => buildReviewQueue(candidates, invalid, visual));
  }
  const duplicate = structuredClone(promotions);
  duplicate.items.push(structuredClone(duplicate.items[0]));
  assert.throws(() => buildReviewQueue(candidates, duplicate, visual), /Duplicate promoted observation/);
});
