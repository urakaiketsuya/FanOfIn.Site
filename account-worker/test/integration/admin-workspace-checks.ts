import assert from 'node:assert/strict';
import { adminOverview, listEditorialPackages, saveEditorialPackage } from '../../src/admin-workspace';
import type { Env, AuthUser } from '../../src/auth';
export async function adminWorkspaceChecks(env: Env, user: AuthUser) {
  assert.deepEqual((await adminOverview(env)).collection, { users: 0, ownedCopies: 0, proxyCopies: 0 });
  assert.equal((await adminOverview(env)).users.total, 1);
  await env.ACCOUNT_DB.prepare("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('signup-only','signup-only','signup@test','Signup','now','now')").run();
  assert.equal((await adminOverview(env)).users.total, 2, 'Accounts without decks count as signed-up users');
  await env.ACCOUNT_DB.prepare(`INSERT INTO collection_entries(user_id,card_uuid,card_name,owned_quantity,proxy_quantity,updated_at,finish)
    VALUES (?, 'card', 'Card', 4, 2, 'now', 'unspecified'),
           (?, 'card', 'Card', 3, 0, 'now', 'foil'),
           ('signup-only', 'proxy', 'Proxy', 0, 5, 'now', 'unspecified'),
           ('signup-only', 'empty', 'Empty', 0, 0, 'now', 'unspecified')`).bind(user.id, user.id).run();
  await env.ACCOUNT_DB.prepare(`INSERT INTO collection_printing_entries(user_id,card_uuid,card_name,edition_uuid,owned_quantity,proxy_quantity,updated_at)
    VALUES (?, 'card', 'Card', 'edition', 6, 1, 'now')`).bind(user.id).run();
  assert.deepEqual((await adminOverview(env)).collection, { users: 2, ownedCopies: 13, proxyCopies: 8 });
  await env.ACCOUNT_DB.prepare("DELETE FROM collection_entries WHERE user_id='signup-only' AND card_uuid='proxy'").run();
  assert.equal((await adminOverview(env)).collection.users, 1, 'Zero-only collections do not count');
  await env.ACCOUNT_DB.prepare('DELETE FROM collection_entries').run();
  assert.deepEqual((await adminOverview(env)).collection, { users: 1, ownedCopies: 6, proxyCopies: 1 }, 'Printing-only users count');
  await env.ACCOUNT_DB.prepare('DELETE FROM collection_printing_entries').run();
  await env.ACCOUNT_DB.prepare("DELETE FROM users WHERE id='signup-only'").run();
  assert.equal((await adminOverview(env)).users.total, 1);
  const input = { revision: 0, status: 'draft', definition: { v: 1, name: 'Editor fixture', cards: [{ name: 'Reposition', section: 'main', quantity: 4 }] } };
  const results = await Promise.all([saveEditorialPackage(env, user, 'test-package', input), saveEditorialPackage(env, user, 'test-package', input)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal((await listEditorialPackages(env, true)).length, 0);
  await assert.rejects(saveEditorialPackage(env, user, 'test-package', { ...input, status: 'published' }), /changed elsewhere/);
  await env.ACCOUNT_DB.prepare("CREATE TRIGGER fail_editor_save BEFORE UPDATE ON editorial_packages BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(saveEditorialPackage(env, user, 'test-package', { ...input, revision: 1, status: 'published' }), /injected_failure/);
  assert.deepEqual((await listEditorialPackages(env))[0], results[0]);
  await env.ACCOUNT_DB.prepare('DROP TRIGGER fail_editor_save').run();
  const published = await saveEditorialPackage(env, user, 'test-package', { ...input, revision: 1, status: 'published' });
  assert.equal(published.revision, 2);
  assert.equal((await listEditorialPackages(env, true)).length, 1);
  await saveEditorialPackage(env, user, 'test-package', { ...input, revision: 2 });
  assert.equal((await listEditorialPackages(env, true)).length, 0);
  for (const visibility of ['private', 'unlisted', 'public'] as const) {
    await env.ACCOUNT_DB.prepare('UPDATE user_decks SET visibility=?').bind(visibility).run();
    const { collectionEngagement: _engagement, ...overview } = await adminOverview(env);
    assert.deepEqual(overview, { users: { total: 1 }, collection: { users: 0, ownedCopies: 0, proxyCopies: 0 }, decks: { private: 0, unlisted: 0, public: 0, [visibility]: 1, total: 1 } });
  }
  await env.ACCOUNT_DB.prepare('UPDATE user_decks SET is_seed=1').run();
  assert.equal((await adminOverview(env)).decks.total, 0);
  const research = { kind: 'experimental', key: 'a'.repeat(64), fingerprint: 'b'.repeat(64), dismissed: false };
  const researchId = `research-${research.key}`;
  const review = { ...input, research };
  const drafts = await Promise.all([saveEditorialPackage(env, user, researchId, review), saveEditorialPackage(env, user, researchId, review)]);
  assert.deepEqual(drafts[0], drafts[1]);
  await env.ACCOUNT_DB.prepare("CREATE TRIGGER fail_research BEFORE UPDATE ON editorial_packages BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  await assert.rejects(saveEditorialPackage(env, user, researchId, { ...review, revision: 1, status: 'published' }), /injected_failure/);
  assert.equal((await listEditorialPackages(env, true)).length, 0);
  assert.deepEqual((await listEditorialPackages(env)).find(pkg => pkg.id === researchId), drafts[0]);
  await env.ACCOUNT_DB.prepare('DROP TRIGGER fail_research').run();
  await saveEditorialPackage(env, user, researchId, { ...review, revision: 1, status: 'published' });
  assert.equal((await listEditorialPackages(env, true))[0].research, undefined);
  await assert.rejects(saveEditorialPackage(env, user, researchId, { ...review, revision: 1, research: { ...research, dismissed: true } }), /changed elsewhere/);
  await saveEditorialPackage(env, user, researchId, { ...review, revision: 2, research: { ...research, dismissed: true } });
  assert.equal((await listEditorialPackages(env, true)).length, 0);
  console.log('Admin workspace: atomic saves, concurrent retries, conflict recovery, publication, and reporting passed.');
}
