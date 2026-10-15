import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async name => JSON.parse(await readFile(new URL(`../../../docs/research/official-merchandise-${name}.json`, import.meta.url), 'utf8'));
const [review, candidates, products, queue] = await Promise.all(['sleeve-review', 'candidates', 'manufacturer-products', 'review-queue'].map(read));

test('sleeve comparisons cover exact evidence and reference existing products without resolving identity', () => {
  const sleeves = candidates.candidates.filter(candidate => candidate.productType === 'sleeves');
  assert.equal(new Set(review.items.map(item => item.candidateId)).size, review.items.length);
  assert.deepEqual(review.items.map(item => item.candidateId).sort(), sleeves.map(item => item.id).sort());
  const key = ({ sourceId, page, sourceLabel }) => JSON.stringify([sourceId, page, sourceLabel]);
  for (const item of review.items) {
    const candidate = sleeves.find(candidate => candidate.id === item.candidateId);
    assert.equal(item.label, candidate.label);
    assert.deepEqual(item.observations.map(key).sort(), candidate.observations.map(key).sort());
    assert.equal(item.status, 'unresolved-product-identity');
    assert(item.evidenceNeeded.length > 0);
    const queued = queue.entries.find(entry => entry.candidateId === item.candidateId);
    assert(queued.observations.every(observation => observation.status === 'needs-review' && !observation.ownershipId));
    if (item.possibleProduct) {
      const product = products.items.find(product => product.ownershipId === item.possibleProduct.ownershipId);
      assert(product, 'Comparison must reference an existing verified manufacturer product');
      for (const field of ['productNumber', 'sourceTitle', 'sourceUrl']) assert.equal(item.possibleProduct[field], product[field]);
    } else {
      assert.equal(item.comparison, 'no-verified-manufacturer-product');
    }
  }
  assert.equal(review.items.filter(item => item.possibleProduct).length, 7);
  const ciel = review.items.filter(item => item.label.startsWith('Ciel'));
  assert.equal(ciel.length, 2);
  assert.equal(ciel[0].possibleProduct.ownershipId, ciel[1].possibleProduct.ownershipId);
  assert.notEqual(ciel[0].candidateId, ciel[1].candidateId);
});
