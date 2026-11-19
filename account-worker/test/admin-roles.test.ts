import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseFixture } from './helpers/database';
import { listAdminUsers, saveAdminRoles } from '../src/admin-roles';
import { canReviewTags } from '../src/card-tags';
import type { AuthUser } from '../src/auth';

test('role grants require admin, remain atomic, retry safely, and keep reviewers out of moderation', async () => {
  const { db, env } = databaseFixture();
  const actor = { id: 'admin' } as AuthUser;
  const bagel = { id: 'bagel' } as AuthUser;
  for (const id of ['admin', 'bagel']) db.prepare('INSERT INTO users(id,google_subject,email,display_name,profile_slug,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,id,`${id}@test`,id,id,'now','now');
  db.prepare("INSERT INTO admin_users(user_id) VALUES('admin')").run();
  const grant = { communityRole: 'member', reviewer: true, admin: false } as const;
  try {
    await assert.rejects(listAdminUsers(env, bagel, ''), /Administrator/);
    await assert.rejects(saveAdminRoles(env, bagel, 'bagel', grant), /Administrator/);
    await assert.rejects(saveAdminRoles(env, actor, 'admin', grant), /own administrator/);
    await assert.rejects(saveAdminRoles(env, actor, 'missing', grant), /not found/);
    await assert.rejects(saveAdminRoles(env, actor, 'bagel', { ...grant, communityRole: 'reviewer' }), /Invalid roles/);
    db.exec("CREATE TRIGGER fail_roles BEFORE INSERT ON admin_users WHEN NEW.user_id='bagel' BEGIN SELECT RAISE(ABORT, 'injected_failure'); END;");
    await assert.rejects(saveAdminRoles(env, actor, 'bagel', { ...grant, communityRole: 'staff', admin: true }), /injected_failure/);
    assert.equal(await canReviewTags(env, bagel), false);
    assert.equal(db.prepare("SELECT community_role FROM users WHERE id='bagel'").get()?.community_role, 'member');
    db.exec('DROP TRIGGER fail_roles');
    const [first, retry] = await Promise.all([saveAdminRoles(env, actor, 'bagel', grant), saveAdminRoles(env, actor, 'bagel', grant)]);
    assert.deepEqual(first, retry);
    assert.equal(first.reviewer, true); assert.equal(first.admin, false); assert.equal(first.communityRole, 'member');
    assert.equal(await canReviewTags(env, bagel), true);
    assert.equal((await listAdminUsers(env, actor, 'bagel')).length, 1);
    assert.equal((await listAdminUsers(env, actor, 'nobody')).length, 0);
    await saveAdminRoles(env, actor, 'bagel', { ...grant, reviewer: false });
    assert.equal(await canReviewTags(env, bagel), false);
  } finally { db.close(); }
});
