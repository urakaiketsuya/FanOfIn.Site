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
  for (const [a,b] of [['Dragonart Chu','Hanh Chu'],['Chu','Hanh Chu']]) assert.notEqual(artistForCredit(a).id, artistForCredit(b).id);
  for (const [a, b] of [['Chu', 'Dragonart Chu'], ['Parhelion Studio Co.', 'Parhelion Studio'], ['十尾', '十尾t'], ['道漫', '道漫?'], ['Primea Studio', 'Primea studio'], ['Dragonart', 'Dragon Art'], ['DragonArt Chu', 'Dragonart Chu'], ['Dragonart Tris', 'DragonArt Tris'], ['DragonArt 白霜茶', 'Dragonart 白霜搽'], ['白霜茶', 'Dragonart 白霜搽']]) {
    assert.equal(artistForCredit(a).id, artistForCredit(b).id);
  }
  const slugs = artistDirectory.flatMap(artist => [artist.slug, ...(artist.slugAliases ?? [])]);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(artistForCredit('Chu').slugAliases?.includes('a056-chu'));
  assert.ok(artistForCredit('DragonArt Tris').slugAliases?.includes('a044-dragonart-tris'));
  assert.ok(artistForCredit('白霜茶').portrait);
  assert.ok(artistForCredit('十尾t').slugAliases?.includes('a072-十尾t'));
  assert.ok(artistForCredit('道漫?').slugAliases?.includes('a075-道漫'));
  assert.ok(artistForCredit('Parhelion Studio').slugAliases?.includes('a038-parhelion-studio'));
  assert.deepEqual(artistForCredit('New Artist').links, []);
  assert.notEqual(artistForCredit('New Artist').slug, artistForCredit('new artist').slug);
});
test('curated identities have unique slugs and credits and HTTPS evidence', () => {
  assert.equal(new Set(artistDirectory.map(artist => artist.id)).size, artistDirectory.length);
  assert.equal(new Set(artistDirectory.map(artist => artist.slug)).size, artistDirectory.length);
  const credits = artistDirectory.flatMap(artist => artist.credits);
  assert.equal(new Set(credits).size, credits.length);
  assert.equal(artistDirectory.flatMap(artist => artist.links).length, 62);
  for (const link of artistDirectory.flatMap(artist => artist.links)) {
    assert.equal(new URL(link.url).protocol, 'https:');
    assert.equal(new URL(link.evidence).protocol, 'https:');
    assert.match(link.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.ok(catalog.flatMap(card => card.editions).filter(edition => edition.illustrator?.trim()).every(edition => !artistForCredit(edition.illustrator!).id.startsWith('credit-')));
});

test('studio relationships follow credited artists without merging their galleries', () => {
  const studio = artistForCredit('Dragon Art');
  const members = artistDirectory.filter(artist => artist.studioId === studio.id);
  assert.equal(members.length, 9);
  assert.ok(members.some(artist => artist.id === artistForCredit('TaroTarou').id));
  for (const member of members) {
    assert.notEqual(member.id, studio.id);
    assert.ok(member.credits.some(credit => /^Dragonart /i.test(credit)));
  }
  for (const artist of artistDirectory.filter(artist => artist.studioId)) {
    assert.equal(artistDirectory.find(studio => studio.id === artist.studioId)?.kind, 'studio');
  }
  assert.equal(artistForCredit('Hanh Chu').studioId, undefined);
});

test('artist cards rank by tournament deck usage with alphabetical ties and missing-data fallback', () => {
  const cards = ['Zulu', 'Alpha', 'Beta', 'Gamma'].map((name, index) => ({ ...catalog[0], uuid: `pop-${index}`, slug: name.toLowerCase(), name, editions: [{ ...catalog[0].editions[0], uuid: `print-${index}`, illustrator: 'Popularity Fixture' }] }));
  const stats = [{name:'Old Zulu Name',slug:'zulu',deckCount:100},{name:'Beta',slug:null,deckCount:10},{name:'Alpha',slug:'alpha',deckCount:10}];
  const gallery = buildArtistGalleries(cards, stats)[0];
  assert.deepEqual(gallery.cards.map(entry=>entry.card.name), ['Zulu','Alpha','Beta','Gamma']);
  assert.equal(gallery.printingCount,4);
  assert.deepEqual(buildArtistGalleries(cards)[0].cards.map(entry=>entry.card.name), ['Alpha','Beta','Gamma','Zulu']);
  assert.deepEqual(cards.map(card=>card.name), ['Zulu','Alpha','Beta','Gamma']);
});

test('artist URLs omit IDs while every previous canonical URL remains an alias', () => {
  for (const artist of artistDirectory) {
    assert.doesNotMatch(artist.slug, /^a\d+-/);
    assert.ok(artist.slugAliases?.includes(`${artist.id}-${artist.slug}`), artist.id);
  }
  assert.equal(artistForCredit('Hanh Chu').slug, 'hanh-chu');
  assert.ok(artistForCredit('Hanh Chu').slugAliases?.includes('a007-hanh-chu'));
});
