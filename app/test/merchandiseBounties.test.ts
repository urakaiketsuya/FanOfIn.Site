import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/features/merchandise/catalog.json';
import { needsMerchandisePhoto } from '../src/features/merchandise/photoSources';

test('bounties distinguish exact releases with seller and reviewed photos', () => {
  for (const [id, expected] of [['sheet-12-b13', false], ['sheet-12-b24', true], ['sheet-12-i18', false], ['sheet-12-i17', true]] as const) {
    const item = catalog.find(item => item.id === id);
    assert.ok(item);
    assert.equal(needsMerchandisePhoto(item), expected, id);
  }
});
test('an unsupported source link still needs an image; an embedded gallery does not', () => {
  const item = { id: 'fixture', name: 'Unpictured item', category: 'Deckboxes', detail: '', photoUrl: '' };
  assert.equal(needsMerchandisePhoto(item), true);
  assert.equal(needsMerchandisePhoto({ ...item, photoUrl: 'https://example.com/listing' }), true);
  assert.equal(needsMerchandisePhoto({ ...item, photoUrl: 'https://imgur.com/a/AbC1234' }), false);
});
