import type { AdminUserRoles, AdminRoleInput } from '@gatcg/shared';
import type { AuthUser, Env } from './auth';
import { requireAdmin } from './admin-workspace';
import { ApiError, badRequest } from './errors';

const selection = `SELECT u.id, u.display_name AS displayName, u.profile_slug AS profileSlug,
  u.community_role AS communityRole,
  EXISTS(SELECT 1 FROM card_tag_reviewers r WHERE r.user_id=u.id) AS reviewer,
  EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id) AS admin FROM users u`;
function present(row: AdminUserRoles): AdminUserRoles { return { ...row, reviewer: !!row.reviewer, admin: !!row.admin }; }
export async function listAdminUsers(env: Env, user: AuthUser, search: string) {
  await requireAdmin(env, user);
  if (search.length > 100) throw badRequest('Search must be at most 100 characters');
  const rows = await env.ACCOUNT_DB.prepare(`${selection} WHERE u.is_system=0 AND
    (?='' OR instr(lower(u.display_name),lower(?))>0 OR instr(lower(COALESCE(u.profile_slug,'')),lower(?))>0)
    ORDER BY u.display_name, u.id LIMIT 50`).bind(search, search, search).all<AdminUserRoles>();
  return rows.results.map(present);
}
export async function saveAdminRoles(env: Env, actor: AuthUser, id: string, value: unknown) {
  await requireAdmin(env, actor);
  const input = value as AdminRoleInput | null;
  if (!input || !['member', 'moderator', 'staff'].includes(input.communityRole) || typeof input.reviewer !== 'boolean' || typeof input.admin !== 'boolean') throw badRequest('Invalid roles');
  if (id === actor.id && !input.admin) throw badRequest('You cannot remove your own administrator access');
  const target = await env.ACCOUNT_DB.prepare('SELECT id FROM users WHERE id=? AND is_system=0').bind(id).first();
  if (!target) throw new ApiError('User not found', 404, 'user_not_found');
  // D1 batches roll back every role change if any statement fails. Inserts are retry-safe.
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare('UPDATE users SET community_role=?, updated_at=? WHERE id=?').bind(input.communityRole, new Date().toISOString(), id),
    input.reviewer ? env.ACCOUNT_DB.prepare('INSERT INTO card_tag_reviewers(user_id,granted_by) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING').bind(id, actor.id) : env.ACCOUNT_DB.prepare('DELETE FROM card_tag_reviewers WHERE user_id=?').bind(id),
    input.admin ? env.ACCOUNT_DB.prepare('INSERT INTO admin_users(user_id) VALUES(?) ON CONFLICT(user_id) DO NOTHING').bind(id) : env.ACCOUNT_DB.prepare('DELETE FROM admin_users WHERE user_id=?').bind(id),
  ]);
  const row = await env.ACCOUNT_DB.prepare(`${selection} WHERE u.id=?`).bind(id).first<AdminUserRoles>();
  if (!row) throw new ApiError('User not found', 404, 'user_not_found');
  return present(row);
}
