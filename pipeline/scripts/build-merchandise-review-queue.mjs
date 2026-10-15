import assert from 'node:assert/strict';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const observationKey = ({ sourceId, page, sourceLabel }) => JSON.stringify([sourceId, page, sourceLabel]);

// Exact evidence accounting only: labels and visual similarities never merge ownership.
export function buildReviewQueue(candidates, promotions, visualReview) {
  const byId = new Map(candidates.candidates.map(candidate => [candidate.id, candidate]));
  assert.equal(byId.size, candidates.candidates.length, 'Duplicate candidate ID');
  const promoted = new Map();
  const ownershipIds = new Set();
  for (const item of promotions.items) {
    const candidate = byId.get(item.candidateId);
    assert(candidate, `Unknown promotion candidate: ${item.candidateId}`);
    const key = `${candidate.id}:${observationKey(item)}`;
    assert(candidate.observations.some(observation => observationKey(observation) === observationKey(item)), `Missing promotion observation: ${key}`);
    assert(!promoted.has(key), `Duplicate promoted observation: ${key}`);
    assert(!ownershipIds.has(item.ownershipId), `Duplicate ownership ID: ${item.ownershipId}`);
    promoted.set(key, item);
    ownershipIds.add(item.ownershipId);
  }
  const entries = candidates.candidates.map(candidate => {
    const references = visualReview.reviews.filter(review => review.candidateIds.includes(candidate.id));
    const observations = candidate.observations.map(observation => {
      const promotion = promoted.get(`${candidate.id}:${observationKey(observation)}`);
      return { ...observation, status: promotion ? 'promoted' : 'needs-review',
        ...(promotion ? { ownershipId: promotion.ownershipId } : {}) };
    });
    const known = observations.filter(observation => observation.status === 'promoted');
    return {
      candidateId: candidate.id, productType: candidate.productType, label: candidate.label,
      status: known.length === observations.length ? 'all-observations-promoted'
        : known.length ? 'additional-appearances-need-review' : 'unpromoted',
      observations,
      ...(references.length ? { visualFindings: references.map(({ status, finding, evidence }) => ({ status, finding, evidence })) } : {}),
    };
  });
  const observations = entries.flatMap(entry => entry.observations);
  const keys = entries.flatMap(entry => entry.observations.map(observation => `${entry.candidateId}:${observationKey(observation)}`));
  assert.equal(new Set(keys).size, keys.length, 'Duplicate candidate observation');
  assert.equal(observations.length + candidates.excludedObservations.length, candidates.counts.observations, 'Observation accounting mismatch');
  return {
    schemaVersion: 1,
    status: 'research-review-queue-not-ownership-catalog',
    policy: [
      'Only exact promoted observations are complete. Other appearances of the same label still require review.',
      'Visual findings are research context, not permission to merge ownership IDs.',
      'Unpromoted label groups are not a count of missing unique products.',
      'Historical catalog coverage gaps remain in official-merchandise-coverage.json.',
    ],
    counts: {
      candidateLabelGroups: entries.length,
      groupsWithPromotions: entries.filter(entry => entry.status !== 'unpromoted').length,
      unpromotedLabelGroups: entries.filter(entry => entry.status === 'unpromoted').length,
      promotedObservations: promoted.size,
      observationsNeedingReview: observations.length - promoted.size,
      excludedGenericObservations: candidates.excludedObservations.length,
      totalSourceObservations: candidates.counts.observations,
    },
    entries,
    additionalVisualFindings: visualReview.additionalFindings,
    excludedObservations: candidates.excludedObservations,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = new URL('../../docs/research/', import.meta.url);
  const read = async name => JSON.parse(await readFile(new URL(`official-merchandise-${name}.json`, base), 'utf8'));
  const inputs = await Promise.all(['candidates', 'promotions', 'visual-review'].map(read));
  const result = buildReviewQueue(...inputs);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  const target = new URL('official-merchandise-review-queue.json', base);
  if (process.argv.includes('--check')) {
    assert.equal(await readFile(target, 'utf8'), output, 'Regenerate merchandise review queue.');
  } else {
    const temporary = new URL(`${target.href}.tmp`);
    await writeFile(temporary, output);
    await rename(temporary, target);
  }
  console.log(JSON.stringify(result.counts));
}
