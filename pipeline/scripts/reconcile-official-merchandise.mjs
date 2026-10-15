import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Research-only: matching text does not establish a retail SKU or artwork identity.
const normalize = (label) => label.normalize('NFC').replaceAll('’', "'")
  .replace(/\s+\((CSR|CUR)\)$/, ' $1').replace(/\s+/g, ' ').trim();
const key = (type, label) => `${type}:${normalize(label)}`;
const idFor = (value) => `merch-candidate-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
const genericListings = new Set(['poster:Posters', 'sleeves:Dragon Shield Sleeves']);
const reviewGroups = [
  ['playmat', ['Merlin, Amethyst Glow', 'Merlin, Amethyst’s Glow'], 'Possible spelling omission; compare artwork.'],
  ['playmat', ['Diana, Haunt Reminisense', 'Diana, Haunt Reminiscence'], 'Possible spelling error; compare artwork.'],
  ['playmat', ['Alice, Phantom Monarch', 'Alice, Phantom Monarch (CSR)', 'Alice, Phantom Monarch (CUR)'], 'Unqualified listing needs an artwork match; CSR and CUR remain distinct.'],
  ['playmat', ['Alice, Trifle’s Royalty', 'Alice, Trifle’s Royalty CUR'], 'Unqualified listing must not automatically inherit CUR.'],
  ['playmat', ['Fluffy Shopkeeper', 'Fluffy Shopkeep PR'], 'Similar title; promotional artwork may differ.'],
  ['compact-deck-box', ['Spirelle', 'Spirelle, Schwartz Queen'], 'Shortened character name; compare box artwork.'],
  ['compact-deck-box', ['Snow White', 'Snow White, Weiss Queen'], 'Shortened character name; compare box artwork.'],
  ['double-deck-box', ['Alice', 'Alice, Phantom Monarch', 'Alice, Trifle’s Royalty'], 'Shortened Alice listing needs an artwork match; named designs remain distinct.'],
  ['keychain', ['Baby Grey', 'Baby Gray Slime'], 'Possible spelling and shortened-name difference; compare design.'],
  ['acrylic-standee', ['Kongming', 'Kong Ming'], 'Spacing difference; compare design before merging.'],
  ['sleeves', ['Ciel', 'Ciel, Mirage’s Grave'], 'Shortened character name; compare sleeve artwork.'],
];

export function reconcileMerchandise(input) {
  assert.equal(input.schemaVersion, 1);
  const candidates = new Map();
  const excludedObservations = [];
  const sourceIds = new Set();
  let observationCount = 0;
  for (const source of input.sources) {
    assert(!sourceIds.has(source.id), `Duplicate source: ${source.id}`);
    sourceIds.add(source.id);
    assert.equal(source.verification, 'catalog-pages-visually-reviewed');
    for (const group of source.groups) {
      assert(source.catalogPages.includes(group.page), `Invalid catalog page: ${source.id}`);
      for (const sourceLabel of group.sourceLabels) {
        assert(sourceLabel.trim());
        observationCount++;
        const evidence = { sourceId: source.id, page: group.page, sourceLabel,
          ...(group.note ? { note: group.note } : {}) };
        const identityKey = key(group.productType, sourceLabel);
        if (genericListings.has(identityKey)) {
          excludedObservations.push({ ...evidence, productType: group.productType, reason: 'No identifiable design specified.' });
          continue;
        }
        let candidate = candidates.get(identityKey);
        if (!candidate) {
          candidate = { id: idFor(identityKey), productType: group.productType,
            label: normalize(sourceLabel), identityStatus: 'pending-artwork-and-variant-review', observations: [] };
          candidates.set(identityKey, candidate);
        }
        candidate.observations.push(evidence);
      }
    }
  }
  const identityReviews = reviewGroups.map(([type, labels, reason]) => ({
    candidateIds: [...new Set(labels.map((label) => candidates.get(key(type, label))?.id).filter(Boolean))],
    reason,
  })).filter((review) => review.candidateIds.length > 1);
  const products = [...candidates.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const product of products) product.observations.sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId) || a.page - b.page || a.sourceLabel.localeCompare(b.sourceLabel));
  assert.equal(new Set(products.map((product) => product.id)).size, products.length, 'Candidate ID collision');
  return {
    schemaVersion: 1,
    status: 'research-candidates-not-production-catalog',
    sourceFile: 'docs/research/official-merchandise-sources.json',
    reviewedAt: input.reviewedAt,
    policy: [
      'Candidates group identical product-type and label text, normalizing apostrophes, whitespace and parentheses around CSR/CUR only.',
      'Candidate IDs identify label groups, not confirmed retail products. Do not use them for ownership until identity review is complete.',
      'Repeated appearances are source evidence, not additional collectibles. Matching labels still require artwork and physical-variant review.',
      'Identity reviews suggest comparisons, never automatic merges. CSR/CUR/PR/SP4 are source artwork labels, not merchandise rarity.',
      'Sizes, dimensions, editions, artist, set, release date and exclusivity remain unknown unless separately verified.',
      'All historical coverage gaps and unverified leads in the source file remain open.',
    ],
    counts: { sources: sourceIds.size, observations: observationCount, candidateLabelGroups: products.length,
      excludedObservations: excludedObservations.length, identityReviews: identityReviews.length },
    candidates: products,
    identityReviews,
    excludedObservations,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceUrl = new URL('../../docs/research/official-merchandise-sources.json', import.meta.url);
  const outputUrl = new URL('../../docs/research/official-merchandise-candidates.json', import.meta.url);
  const result = reconcileMerchandise(JSON.parse(await readFile(sourceUrl, 'utf8')));
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    assert.equal(await readFile(outputUrl, 'utf8'), output, 'Regenerate merchandise candidates.');
  } else {
    const temporaryUrl = new URL(`${outputUrl.href}.tmp`);
    await writeFile(temporaryUrl, output);
    await rename(temporaryUrl, outputUrl);
  }
  console.log(JSON.stringify(result.counts));
}
