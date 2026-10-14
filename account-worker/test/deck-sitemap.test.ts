import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseFixture } from './helpers/database';
import { parseSaveInput } from '../src/deck-input';
import { saveDeck } from '../src/decks';
import { discoverDeckSitemap, discoverDecks } from '../src/discovery';
import type { AuthUser } from '../src/auth';

test('sitemap tracks discovery privacy, publication ownership, moderation and seed eligibility live', async () => {
  const { db, env } = databaseFixture();
  try {
    db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at,profile_discoverable) VALUES('a','a','a@test','A','now','now',1)");
    const { id } = await saveDeck(env, { id: 'a' } as AuthUser, parseSaveInput({ title: 'Deck', format: 'STANDARD', decklist: { main: [{ card: 'First', quantity: 4 }], material: [], sideboard: [] }, source: { provider: 'manual', externalDeckId: 'one', label: 'Manual' } }));
    const slug = 'a'.repeat(32);
    db.prepare("UPDATE user_decks SET public_slug=?, visibility='public', published_version_id=current_version_id, published_title='Deck', published_description='', published_at='2026-10-14' WHERE id=?").run(slug, id);
    const check = async (eligible: boolean) => {
      assert.deepEqual((await discoverDeckSitemap(env)).slugs, eligible ? [slug] : []);
      assert.deepEqual((await discoverDecks(env, new URLSearchParams())).decks.map(d => d.publicSlug), eligible ? [slug] : []);
    };
    await check(true);
    for (const field of ["visibility='unlisted'", "visibility='private'", "moderation_status='hidden'", 'published_version_id=NULL', 'is_seed=1, seed_discoverable=0']) {
      db.exec(`UPDATE user_decks SET ${field}`);
      await check(false);
      db.exec("UPDATE user_decks SET visibility='public', moderation_status='active', published_version_id=current_version_id, is_seed=0, seed_discoverable=1");
      await check(true);
    }
    db.exec('UPDATE users SET profile_discoverable=0'); await check(false);
    db.exec('UPDATE users SET profile_discoverable=1'); await check(true);
    db.exec('UPDATE user_decks SET is_seed=1, seed_discoverable=1'); await check(true);
    const other = await saveDeck(env, { id: 'a' } as AuthUser, parseSaveInput({ title: 'Other', format: 'STANDARD', decklist: { main: [{ card: 'Second', quantity: 4 }], material: [], sideboard: [] }, source: { provider: 'manual', externalDeckId: 'two', label: 'Manual' } }));
    db.prepare("UPDATE user_decks SET visibility='private' WHERE id=?").run(other.id);
    db.prepare('UPDATE user_decks SET published_version_id=(SELECT current_version_id FROM user_decks WHERE id=?) WHERE id=?').run(other.id, id);
    await check(false);
  } finally { db.close(); }
});
