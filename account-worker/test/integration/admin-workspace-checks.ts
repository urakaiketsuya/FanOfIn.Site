import assert from 'node:assert/strict';
import { adminOverview, listEditorialPackages, saveEditorialPackage } from '../../src/admin-workspace';
import type { Env, AuthUser } from '../../src/auth';
export async function adminWorkspaceChecks(env: Env, user: AuthUser) {
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
    assert.deepEqual(await adminOverview(env), { decks: { private: 0, unlisted: 0, public: 0, [visibility]: 1, total: 1 } });
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
