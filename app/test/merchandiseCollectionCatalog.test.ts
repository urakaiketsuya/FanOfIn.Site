import assert from 'node:assert/strict';
import test from 'node:test';
import { merchandiseCatalog, merchandiseCollectionItems, merchandiseItems, merchandiseOwnershipIds, merchandiseProgress, parseMerchandiseQuantities } from '@gatcg/shared';
import links from '../../shared/src/merchandiseCatalogLinks.json';
import { merchandisePhotoSources } from '../src/features/merchandise/photoSources';

test('every catalog row is trackable and every original ownership ID survives exactly once', () => {
  const ids = merchandiseCollectionItems.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(merchandiseItems.length, 168);
  for (const item of merchandiseItems) assert.equal(ids.filter(id => id === item.id).length, 1, item.id);
  for (const item of merchandiseCatalog) assert.ok(merchandiseOwnershipIds(item.id).length > 0, item.id);
  const old = Object.fromEntries(merchandiseItems.map((item, i) => [item.id, i % 999 + 1]));
  assert.deepEqual(parseMerchandiseQuantities(old), old);
  const mixed = { ...old, 'sheet-12-b226': 3, 'sheet-12-b242': 2 };
  assert.deepEqual(parseMerchandiseQuantities(mixed), mixed);
  assert.deepEqual(merchandiseProgress(ids, mixed), { owned: 170, total: ids.length });
});

test('explicit identity links retain full variant guards and never merge saved IDs', () => {
  assert.equal(new Set(links.items.map(link => link.ownershipId)).size, links.items.length);
  assert.equal(new Set([...links.items, ...links.bundles].map(link => link.catalogId)).size, links.items.length + links.bundles.length);
  for (const link of [...links.items, ...links.bundles]) {
    const row = merchandiseCatalog.find(item => item.id === link.catalogId)!;
    assert.deepEqual([row.name, row.category, row.detail], [link.name, link.category, link.detail]);
    if ("ownershipId" in link) assert.deepEqual(merchandiseOwnershipIds(link.catalogId), [link.ownershipId]);
  }
  assert.deepEqual(merchandiseOwnershipIds('sheet-2-g5'), ['merch-ascent-playmat-enfeebling-orb-pr']);
  assert.deepEqual(merchandiseOwnershipIds('sheet-12-b226'), ['sheet-12-b226']);
  // A different PRD caption is not the old Aenean Initiate design.
  assert.deepEqual(merchandiseOwnershipIds('sheet-11-a4'), ['sheet-11-a4']);
  assert.ok(merchandiseCollectionItems.some(item => item.id === 'merch-ascent-playmat-dante-aenean-initiate'));
  // These source-row aliases never become competing writable quantities.
  assert.throws(() => parseMerchandiseQuantities({ 'sheet-2-g5': 1 }), /Invalid/);
});

test('set overview leads to component quantities without inventing full-set ownership', () => {
  const ids = merchandiseOwnershipIds('sheet-12-b138');
  assert.equal(ids.length, 7);
  assert.ok(ids.every(id => id.startsWith('merch-seaside-splash-2026-merlin-')));
  const quantities = { [ids[0]]: 2 };
  assert.deepEqual(parseMerchandiseQuantities(quantities), quantities);
  assert.deepEqual(merchandiseProgress(ids, quantities), { owned: 1, total: 7 });
  assert.throws(() => parseMerchandiseQuantities({ 'sheet-12-b138': 1 }), /Invalid/);
});

test('collection uses the same exact photo rows for new items and existing ownership', () => {
  for (const id of ['sheet-2-g5', 'sheet-12-b220', 'sheet-12-b226', 'sheet-12-b230', 'sheet-12-b242']) {
    const entry = merchandiseCatalog.find(item => item.id === id)!;
    const collection = merchandiseCollectionItems.find(item => item.catalogEntry?.id === id)!;
    assert.equal(collection.catalogEntry, entry);
    assert.ok(merchandisePhotoSources(entry).imageUrl);
    assert.deepEqual(merchandisePhotoSources(collection.catalogEntry!), merchandisePhotoSources(entry));
  }
});
