import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEditorialPackage, requireAdmin } from '../src/admin-workspace';
import type { Env, AuthUser } from '../src/auth';
const input = { revision: 0, status: 'draft', definition: { v: 1, name: 'Example', cards: [{ name: 'Reposition', section: 'main', quantity: 4 }] } };
test('editor validation rejects malformed sections, copies, duplicates, and display text', () => {
  assert.equal(parseEditorialPackage(input).definition.cards[0].quantity, 4);
  for (const section of ['main', 'material', 'sideboard']) assert.equal(parseEditorialPackage({ ...input, definition: { ...input.definition, cards: [{ ...input.definition.cards[0], section }] } }).definition.cards[0].section, section);
  for (const patch of [{ section: 'maybeboard' }, { quantity: 0 }, { quantity: 5 }, { quantity: 1.5 }, { name: ' Reposition' }]) assert.throws(() => parseEditorialPackage({ ...input, definition: { ...input.definition, cards: [{ ...input.definition.cards[0], ...patch }] } }));
  assert.throws(() => parseEditorialPackage({ ...input, definition: { ...input.definition, cards: [...input.definition.cards, ...input.definition.cards] } }));
  for (const status of ['draft', 'published']) assert.throws(() => parseEditorialPackage({ ...input, status, definition: { ...input.definition, name: 'fuck you' } }));
});
test('admin authorization denies ordinary accounts and permits only explicit grants', async () => {
  for (const granted of [false, true]) {
    const env = { ACCOUNT_DB: { prepare: () => ({ bind: (id: string) => ({ first: async () => granted && id === 'admin' ? { user_id: id } : null }) }) } } as unknown as Env;
    await assert.rejects(requireAdmin(env, { id: 'member' } as AuthUser), /Administrator/);
    if (granted) await requireAdmin(env, { id: 'admin' } as AuthUser);
    else await assert.rejects(requireAdmin(env, { id: 'admin' } as AuthUser), /Administrator/);
  }
});

test('HTTP routes enforce account grants on every admin read and write', async () => {
  const { databaseFixture } = await import('./helpers/database');
  const { default: worker } = await import('../src/index');
  const { db, env } = databaseFixture();
  Object.assign(env, { ALLOWED_ORIGINS: 'http://localhost:5173', WRITE_RATE_LIMITER: { limit: async () => ({ success: true }) } });
  try {
    db.prepare("INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES('a','a','a@test','Admin','admin','now','now')").run();
    const now = new Date().toISOString();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('test-token'))), byte => byte.toString(16).padStart(2, '0')).join('');
    db.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?)').run('s', 'a', hash, new Date(Date.now() + 60_000).toISOString(), now, now);
    const request = (path: string, signedIn: boolean, method = 'GET') => worker.fetch(new Request(`http://localhost${path}`, { method, headers: { Origin: 'http://localhost:5173', ...(signedIn ? { Cookie: 'fanofin_session=test-token' } : {}) }, ...(method === 'PUT' ? { body: JSON.stringify(input) } : {}) }), env);
    for (const [path, method] of [['/v1/admin/overview', 'GET'], ['/v1/admin/packages', 'GET'], ['/v1/admin/packages/example', 'PUT']]) {
      assert.equal((await request(path, false, method)).status, 401);
      assert.equal((await request(path, true, method)).status, 403);
    }
    db.prepare("INSERT INTO admin_users(user_id) VALUES('a')").run();
    assert.equal((await request('/v1/admin/packages/example', true, 'PUT')).status, 200);
    assert.deepEqual(await (await request('/v1/packages', false)).json(), { packages: [] });
    db.prepare("UPDATE editorial_packages SET status='published'").run();
    assert.equal((await (await request('/v1/packages', false)).json() as { packages: unknown[] }).packages.length, 1);
    db.prepare('DELETE FROM admin_users').run();
    assert.equal((await request('/v1/admin/overview', true)).status, 403);
  } finally { db.close(); }
});
