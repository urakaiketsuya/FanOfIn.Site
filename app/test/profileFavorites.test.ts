import assert from 'node:assert/strict';
import test from 'node:test';
import { artistDirectory, matchesArtistSearch, profileArtistOptions } from '../../shared/src/index';
import { verifyShowcaseFavorites } from '../src/lib/profileShowcaseSave';

test('artist picker and directory match plain pinyin, romaji, credits and compact readings', () => {
  for (const [name, query] of [['檸檬夾心餅', 'ningmeng jiaxinbing'], ['南佑希', 'minami yuki'], ['ジェゼ一', 'jeze'], ['代々', 'DAIDAI']] as const) {
    const artist = artistDirectory.find(a => a.name.includes(name))!;
    assert.ok(artist, name);
    assert.ok(matchesArtistSearch(artist, query), query);
    assert.ok(matchesArtistSearch(profileArtistOptions.find(a => a.id === artist.id)!, query), query);
    assert.ok(matchesArtistSearch(artist, artist.credits[0]));
    assert.equal(matchesArtistSearch(artist, 'no-such-artist-xyz'), false);
  }
});

test('save confirmation rejects dropped favorites and accepts cleared optional fields', () => {
  const base = { cardIds: [], deckSlugs: [], revision: 1 };
  const requested = { ...base, favoriteArtistIds: ['a001'], favoriteSetIds: ['DOA'] };
  assert.throws(() => verifyShowcaseFavorites(requested, base), /selections are kept/);
  assert.throws(() => verifyShowcaseFavorites(requested, { ...requested, favoriteSetIds: [] }), /not saved/);
  assert.doesNotThrow(() => verifyShowcaseFavorites(requested, { ...requested, revision: 2 }));
  assert.doesNotThrow(() => verifyShowcaseFavorites({ ...base, favoriteArtistIds: [], favoriteSetIds: [] }, base));
});
