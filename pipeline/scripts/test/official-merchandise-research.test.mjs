import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async (name) => JSON.parse(await readFile(new URL(`../../../docs/research/official-merchandise-${name}.json`, import.meta.url), 'utf8'));
const [sources, candidates, visual, coverage, bundles] = await Promise.all(
  ['sources', 'candidates', 'visual-review', 'coverage', 'bundles'].map(read));
const sorted = (values) => [...values].sort();
const groupKey = (ids) => sorted(ids).join('|');

test('every visual finding refers to real candidates and their recorded source observations', () => {
  assert.deepEqual(sorted(visual.reviews.map(r => groupKey(r.candidateIds))),
    sorted(candidates.identityReviews.map(r => groupKey(r.candidateIds))));
  for (const review of visual.reviews) {
    const products = review.candidateIds.map(id => {
      const candidate = candidates.candidates.find(c => c.id === id);
      assert(candidate, `Missing candidate ${id}`);
      return candidate;
    });
    for (const evidence of review.evidence) {
      assert(products.some(c => c.observations.some(o => o.sourceId === evidence.sourceId
        && o.page === evidence.page && o.sourceLabel === evidence.sourceLabel)),
      `Untraceable visual evidence: ${JSON.stringify(evidence)}`);
    }
  }
  for (const finding of visual.additionalFindings) for (const evidence of finding.evidence) {
    assert(sources.sources.find(s => s.id === evidence.sourceId)?.catalogPages.includes(evidence.page));
  }
});

test('coverage preserves every article and keeps verified catalogs separate from gaps', () => {
  assert.equal(new Set(coverage.events.map(e => e.id)).size, coverage.events.length);
  const urls = coverage.events.flatMap(e => e.articleUrls).concat(coverage.unassignedArticles.map(a => a.url));
  assert.deepEqual(sorted(urls), sorted(sources.officialAscentArticleInventory.map(a => a.url)));
  const verified = coverage.events.filter(e => e.status === 'catalog-visually-reviewed');
  assert.deepEqual(sorted(verified.map(e => e.sourceId)), sorted(sources.sources.map(s => s.id)));
  for (const event of verified) assert.equal(event.catalogUrl, sources.sources.find(s => s.id === event.sourceId).url);
  for (const event of coverage.events.filter(e => e.status === 'future-event-catalog-not-located')) {
    assert(event.announcedStartDate > coverage.reviewedAt);
    assert(!event.sourceId);
  }
  for (const event of coverage.events.filter(e => e.status !== 'catalog-visually-reviewed')) assert(!event.catalogUrl);
});

test('bundle records retain official provenance without promoting overview images or card contents', () => {
  assert.equal(new Set(bundles.bundles.map(b => b.id)).size, bundles.bundles.length);
  for (const bundle of bundles.bundles) {
    assert.equal(new URL(bundle.sourceUrl).hostname, 'www.gatcg.com');
    assert.equal(new URL(bundle.image.url).hostname, 'ga-mainsite-common.s3.us-west-2.amazonaws.com');
    assert.equal(bundle.image.role, 'bundle-overview');
    assert.equal(bundle.image.verification, 'official-article-link-image-not-visually-reviewed');
    assert.equal(bundle.components.filter(c => c.productType === 'storage-box').length, 1);
    assert(bundle.components.every(c => !['card', 'promo-card', 'bundle'].includes(c.productType)));
    assert(bundle.excludedCardContents.nonFoil > 0);
    assert.equal(bundle.excludedCardContents.foil, 1);
    assert(bundle.announcedProductionUnits === null || Number.isInteger(bundle.announcedProductionUnits));
    assert(!('artist' in bundle) && !('cardSet' in bundle));
  }
});
