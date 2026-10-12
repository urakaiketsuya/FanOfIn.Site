import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogSnapshot } from './catalogSnapshot.js';
const source = () => ({ generatedAt: '2026-10-10T00:00:00Z', cards: [{ uuid: 'card', name: 'Card', slug: 'card', editions: [{ uuid: 'edition', collector_number: '001', set: { id: 'set', name: 'Set', prefix: 'SET', language: 'EN' } }] }] });
test('crawl timestamp does not create a new content version', () => {
  const a = source(), b = source(); b.generatedAt = '2026-10-11T00:00:00Z';
  assert.equal(buildCatalogSnapshot(a).metadata.version, buildCatalogSnapshot(b).metadata.version);
});
test('rejects empty catalogs and duplicate identities', () => {
  assert.throws(() => buildCatalogSnapshot({ generatedAt: source().generatedAt, cards: [] }));
  const duplicate = source(); duplicate.cards.push(duplicate.cards[0]!);
  assert.throws(() => buildCatalogSnapshot(duplicate));
  const editions = source(); editions.cards[0]!.editions.push(editions.cards[0]!.editions[0]!);
  assert.throws(() => buildCatalogSnapshot(editions));
});
