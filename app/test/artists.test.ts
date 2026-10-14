import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { artistDirectory, artistForCredit, buildArtistGalleries, type Card } from '@gatcg/shared';

const catalog = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
test('every credited printing stays with its artist and counts unique cards separately', () => {
  const galleries = buildArtistGalleries(catalog);
  const expected = catalog.flatMap(card => card.editions.filter(edition => edition.illustrator?.trim()));
  assert.equal(galleries.reduce((n, artist) => n + artist.printingCount, 0), expected.length);
  for (const artist of galleries) {
    assert.equal(new Set(artist.cards.map(entry => entry.card.uuid)).size, artist.cards.length);
    for (const entry of artist.cards) for (const edition of entry.editions) {
      assert.equal(artistForCredit(edition.illustrator!).id, artist.id);
      assert.ok(entry.card.editions.some(candidate => candidate.uuid === edition.uuid));
    }
  }
  const multiArtist = catalog.find(card => new Set(card.editions.map(edition => edition.illustrator?.trim()).filter(Boolean)).size > 1)!;
  assert.ok(multiArtist);
  for (const edition of multiArtist.editions.filter(edition => edition.illustrator?.trim())) {
    const gallery = galleries.find(artist => artist.id === artistForCredit(edition.illustrator!).id)!;
    assert.ok(gallery.cards.find(entry => entry.card.uuid === multiArtist.uuid)!.editions.some(candidate => candidate.uuid === edition.uuid));
  }
});
test('only supported aliases merge and new credits remain distinct', () => {
  assert.equal(artistForCredit(' Hanh Chu\n').id, artistForCredit('Hanh Chu').id);
  assert.equal(artistForCredit('TaroTarou').id, artistForCredit('DragonArt TaroTarou').id);
  for (const [a,b] of [['Primea Studio','Primea studio'],['DragonArt 白霜茶','Dragonart 白霜搽'],['十尾','十尾t'],['道漫','道漫?'],['Dragonart Chu','Hanh Chu']]) assert.notEqual(artistForCredit(a).id, artistForCredit(b).id);
  assert.deepEqual(artistForCredit('New Artist').links, []);
  assert.notEqual(artistForCredit('New Artist').slug, artistForCredit('new artist').slug);
});
test('curated identities have unique slugs and credits and HTTPS evidence', () => {
  assert.equal(new Set(artistDirectory.map(artist => artist.id)).size, artistDirectory.length);
  assert.equal(new Set(artistDirectory.map(artist => artist.slug)).size, artistDirectory.length);
  const credits = artistDirectory.flatMap(artist => artist.credits);
  assert.equal(new Set(credits).size, credits.length);
  assert.equal(artistDirectory.flatMap(artist => artist.links).length, 29);
  for (const link of artistDirectory.flatMap(artist => artist.links)) {
    assert.equal(new URL(link.url).protocol, 'https:');
    assert.equal(new URL(link.evidence).protocol, 'https:');
    assert.match(link.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.ok(catalog.flatMap(card => card.editions).filter(edition => edition.illustrator?.trim()).every(edition => !artistForCredit(edition.illustrator!).id.startsWith('credit-')));
});
