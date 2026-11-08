import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { usernameBase } from '../src/profile-address';

test('username addresses normalize safely', () => {
  assert.equal(usernameBase('Player Name'), 'player-name');
  assert.equal(usernameBase('___Hello!___'), 'hello');
  assert.equal(usernameBase('玩家'), 'player');
});
test('username migration preserves old links, handles duplicates and reserves every address', () => {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  try {
    for (const file of readdirSync(dir).filter(file => file.endsWith('.sql') && file < '0038').sort()) db.exec(readFileSync(new URL(file, dir), 'utf8'));
    const insert = db.prepare('INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');
    for (const [id, name] of [['a', 'Player Name'], ['b', 'Same Name'], ['c', 'Same Name'], ['d', '玩家'], ['e', 'f'.repeat(24)], ['f', 'Reserved']]) insert.run(id, id, `${id}@test`, name, id.repeat(24), 'now', 'now');
    insert.run('z-owner', 'owner', 'owner@test', 'Workspace Owner', 'bfbf414a98b9c4d8214e7f6c', 'now', 'now');
    db.exec(readFileSync(new URL('0038_username_links.sql', dir), 'utf8'));
    for (let attempt = 0; attempt < 2; attempt++) db.exec(readFileSync(new URL('0039_admin_owner.sql', dir), 'utf8'));
    assert.deepEqual(db.prepare('SELECT user_id FROM admin_users').all().map(row => row.user_id), ['z-owner']);
    const rows = db.prepare('SELECT id, profile_slug FROM users ORDER BY id').all();
    assert.equal(rows[0].profile_slug, 'player-name');
    assert.equal(rows[1].profile_slug, `same-name-account-${'b'.repeat(24)}`);
    assert.equal(rows[2].profile_slug, `same-name-account-${'c'.repeat(24)}`);
    assert.equal(rows[3].profile_slug, 'player');
    assert.notEqual(rows[4].profile_slug, 'f'.repeat(24));
    assert.equal(db.prepare('SELECT count(*) AS n FROM profile_aliases').get()!.n, 14);
    assert.throws(() => db.prepare("UPDATE users SET profile_slug='player-name' WHERE id='b'").run(), /profile_address_taken/);
    assert.equal(db.prepare("SELECT display_name FROM users WHERE id='b'").get()!.display_name, 'Same Name');
  } finally { db.close(); }
});

test('a concurrent username claim retries without partially updating the account', async () => {
  const { databaseFixture } = await import('./helpers/database');
  const { writeUsernameAddress } = await import('../src/profile-address');
  const { db, env } = databaseFixture();
  try {
    for (const id of ['first', 'second']) db.prepare('INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id, id, `${id}@test`, id, id, 'now', 'now');
    let attempts = 0;
    const address = await writeUsernameAddress(env, 'Racing Name', 'second', async slug => {
      if (++attempts === 1) db.prepare("UPDATE users SET profile_slug='racing-name' WHERE id='first'").run();
      return env.ACCOUNT_DB.prepare("UPDATE users SET profile_slug=?, display_name='Racing Name' WHERE id='second'").bind(slug).run();
    });
    assert.equal(attempts, 2);
    assert.equal(address, 'racing-name-second');
    assert.equal(db.prepare("SELECT user_id FROM profile_aliases WHERE slug='racing-name'").get()!.user_id, 'first');
  } finally { db.close(); }
});
