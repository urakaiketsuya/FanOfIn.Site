import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseFixture } from './helpers/database';
import { saveEditorialPackage, listEditorialPackages, parseEditorialPackage } from '../src/admin-workspace';
import type { AuthUser } from '../src/auth';
const research = { kind: 'experimental', key: 'a'.repeat(64), fingerprint: 'b'.repeat(64), dismissed: false };
const input = { revision: 0, status: 'draft', research, definition: { v: 1, name: 'Reviewed package', cards: [{ name: 'Reposition', section: 'main', quantity: 2 }] } };
const id = `research-${research.key}`;
test('research decisions and publication are atomic, retryable, and conflict protected', async () => {
  const { db, env } = databaseFixture();
  const user = { id: 'reviewer' } as AuthUser;
  try {
    db.prepare("INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES('reviewer','r','r@test','Reviewer','reviewer','now','now')").run();
    const [first, retried] = await Promise.all([saveEditorialPackage(env, user, id, input), saveEditorialPackage(env, user, id, input)]);
    assert.deepEqual(first, retried);
    assert.equal((await listEditorialPackages(env)).length, 1);
    assert.equal((await listEditorialPackages(env, true)).length, 0);
    db.exec("CREATE TRIGGER fail_review BEFORE UPDATE ON editorial_packages BEGIN SELECT RAISE(ABORT, 'injected_failure'); END");
    await assert.rejects(saveEditorialPackage(env, user, id, { ...input, revision: 1, status: 'published' }), /injected_failure/);
    assert.deepEqual((await listEditorialPackages(env))[0], first);
    assert.equal((await listEditorialPackages(env, true)).length, 0);
    db.exec('DROP TRIGGER fail_review');
    const approval = { ...input, revision: 1, status: 'published' };
    const approved = await saveEditorialPackage(env, user, id, approval);
    assert.deepEqual(await saveEditorialPackage(env, user, id, approval), approved);
    const publicPackage = (await listEditorialPackages(env, true))[0];
    assert.equal(publicPackage.research, undefined);
    assert.deepEqual(publicPackage.definition, approved.definition);
    await assert.rejects(saveEditorialPackage(env, user, id, { ...input, revision: 1, research: { ...research, dismissed: true } }), /changed elsewhere/);
    await assert.rejects(saveEditorialPackage(env, user, id, { ...input, revision: 2, research: { ...research, kind: 'construction' } }), /changed elsewhere/);
    await saveEditorialPackage(env, user, id, { ...input, revision: 2, research: { ...research, dismissed: true } });
    assert.equal((await listEditorialPackages(env, true)).length, 0);
    assert.equal((await listEditorialPackages(env))[0].research?.dismissed, true);
    await saveEditorialPackage(env, user, id, { ...input, revision: 3 });
    assert.equal((await listEditorialPackages(env))[0].research?.dismissed, false);
  } finally { db.close(); }
});
test('research references cannot lose provenance or publish a dismissed decision', async () => {
  assert.throws(() => parseEditorialPackage({ ...input, status: 'published', research: { ...research, dismissed: true } }));
  for (const patch of [{ kind: 'other' }, { key: 'bad' }, { fingerprint: '' }, { dismissed: 'yes' }]) assert.throws(() => parseEditorialPackage({ ...input, research: { ...research, ...patch } }));
  const { db, env } = databaseFixture();
  try {
    await assert.rejects(saveEditorialPackage(env, {} as AuthUser, 'wrong-id', input), /identifier does not match/);
    await assert.rejects(saveEditorialPackage(env, {} as AuthUser, id, { ...input, research: undefined }), /reference is required/);
  } finally { db.close(); }
});

test('editorial definitions preserve mixed sections for drafts and publication', () => {
  for (const status of ['draft', 'published']) {
    const definition = { v: 1, name: 'Mixed package', cards: [
      { name: 'Reposition', section: 'main', quantity: 3 },
      { name: 'Reposition', section: 'sideboard', quantity: 1 },
      { name: 'Backup Charger', section: 'material', quantity: 1 },
    ] };
    assert.deepEqual(parseEditorialPackage({ revision: 0, status, definition }).definition, definition);
    assert.throws(() => parseEditorialPackage({ revision: 0, status, definition: { ...definition, cards: [{ name: 'A', section: 'invalid', quantity: 1 }] } }));
  }
});
