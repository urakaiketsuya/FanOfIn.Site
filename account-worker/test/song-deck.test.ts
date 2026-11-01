import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseFixture } from './helpers/database';
import { validDecklist, parseSaveInput, fullIdentityHash, identityHash } from '../src/deck-input';
import { saveDeck, getDeck } from '../src/decks';
import type { AuthUser } from '../src/auth';
const decklist = { main: [], material: [{ card: 'Casella, Volant Songstress', quantity: 1 }], sideboard: [], song: [{ card: 'Chromatic', quantity: 1 }] };
test('Song input is validated and distinguishes stored builds without changing tournament identity', async () => {
  assert.equal(validDecklist(decklist), true);
  assert.equal(validDecklist({ ...decklist, song: 'lost' }), false);
  assert.equal(validDecklist({ ...decklist, song: [{ card: 'Chromatic', quantity: -1 }] }), false);
  assert.equal(await identityHash(decklist), await identityHash({ ...decklist, song: [] }));
  assert.notEqual(await fullIdentityHash(decklist, 'STANDARD', 'Casella'), await fullIdentityHash({ ...decklist, song: [] }, 'STANDARD', 'Casella'));
});
test('Song save rolls back atomically, survives retry and concurrent duplicate saves', async () => {
  const f = databaseFixture();
  try {
    f.db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('song','song','song@example.test','Song','now','now')");
    const user = { id: 'song' } as AuthUser;
    const input = parseSaveInput({ title: 'Song draft', format: 'STANDARD', decklist, source: { provider: 'manual', externalDeckId: 'song-draft', label: 'Manual' } });
    f.db.exec("CREATE TRIGGER fail_song BEFORE INSERT ON deck_versions BEGIN SELECT RAISE(ABORT, 'song rollback'); END");
    await assert.rejects(saveDeck(f.env, user, input), /song rollback/);
    assert.equal(f.db.prepare('SELECT count(*) n FROM user_decks').get()!.n, 0);
    f.db.exec('DROP TRIGGER fail_song');
    const results = await Promise.all([saveDeck(f.env, user, input), saveDeck(f.env, user, input)]);
    assert.equal(results[0].id, results[1].id);
    const saved = await getDeck(f.env, user, results[0].id);
    assert.deepEqual(saved!.decklist.song, decklist.song);
    assert.deepEqual(saved!.versions[0].decklist.song, decklist.song);
  } finally { f.db.close(); }
});
