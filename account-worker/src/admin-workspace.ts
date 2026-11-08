import { decodePackage, encodePackage, type EditorialPackage, type EditorialPackageInput, type SharedPackage } from '@gatcg/shared';
import type { AuthUser, Env } from './auth';
import { ApiError, badRequest } from './errors';
import { normalizeDisplayText } from './content-policy';

export async function isAdmin(env: Env, user: AuthUser): Promise<boolean> {
  return !!await env.ACCOUNT_DB.prepare('SELECT user_id FROM admin_users WHERE user_id = ?').bind(user.id).first();
}
export async function requireAdmin(env: Env, user: AuthUser): Promise<void> {
  if (!await isAdmin(env, user)) throw new ApiError('Administrator access is required', 403, 'admin_required');
}
export async function adminOverview(env: Env) {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT visibility, COUNT(*) AS total FROM user_decks WHERE is_seed = 0 GROUP BY visibility`).all<{ visibility: 'private' | 'unlisted' | 'public'; total: number }>();
  const decks = { private: 0, unlisted: 0, public: 0, total: 0 };
  for (const row of rows.results) { decks[row.visibility] = Number(row.total); decks.total += Number(row.total); }
  return { decks };
}
interface PackageRow { id: string; definition_json: string; status: 'draft' | 'published'; revision: number; updated_at: string }
function present(row: PackageRow): EditorialPackage {
  return { id: row.id, definition: JSON.parse(row.definition_json), status: row.status, revision: row.revision, updatedAt: row.updated_at };
}
export async function listEditorialPackages(env: Env, publishedOnly = false) {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT id, definition_json, status, revision, updated_at FROM editorial_packages ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY updated_at DESC, id`).all<PackageRow>();
  return rows.results.map(present);
}
export function parseEditorialPackage(value: unknown): EditorialPackageInput {
  if (!value || typeof value !== 'object') throw badRequest('Invalid package');
  const body = value as Record<string, unknown>;
  if (body.status !== 'draft' && body.status !== 'published') throw badRequest('Invalid publication status');
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw badRequest('Invalid revision');
  const raw = body.definition as SharedPackage | undefined;
  if (!raw || raw.v !== 1 || !Array.isArray(raw.cards) || raw.cards.some(card => !card || (card.section !== 'main' && card.section !== 'material') || typeof card.name !== 'string' || card.name !== card.name.trim())) throw badRequest('Invalid card list');
  let definition: SharedPackage | null = null;
  try { definition = decodePackage(encodePackage(body.definition as SharedPackage)); } catch { /* Invalid shape. */ }
  if (!definition) throw badRequest('Add 1–60 card lines with 1–4 copies each');
  definition.name = normalizeDisplayText(definition.name, 'Package name', 80, true);
  if (definition.champion) definition.champion = normalizeDisplayText(definition.champion, 'Champion', 80, true);
  return { definition, status: body.status, revision: Number(body.revision) };
}
export async function saveEditorialPackage(env: Env, user: AuthUser, id: string, value: unknown) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw badRequest('Invalid package identifier');
  const input = parseEditorialPackage(value);
  const json = JSON.stringify(input.definition);
  const now = new Date().toISOString();
  // One conditional write creates or replaces the complete resource. Retried identical saves are harmless.
  const written = input.revision === 0
    ? await env.ACCOUNT_DB.prepare(`INSERT INTO editorial_packages (id, definition_json, status, revision, updated_by, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING id, definition_json, status, revision, updated_at`).bind(id, json, input.status, user.id, now, now).first<PackageRow>()
    : await env.ACCOUNT_DB.prepare(`UPDATE editorial_packages SET definition_json=?, status=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=? RETURNING id, definition_json, status, revision, updated_at`).bind(json, input.status, user.id, now, id, input.revision).first<PackageRow>();
  if (written) return present(written);
  const row = await env.ACCOUNT_DB.prepare('SELECT id, definition_json, status, revision, updated_at FROM editorial_packages WHERE id=?').bind(id).first<PackageRow>();
  if (!row || (row.revision !== input.revision + 1 || row.definition_json !== json || row.status !== input.status)) throw new ApiError('This package changed elsewhere. Reload the saved version before editing again.', 409, 'revision_conflict');
  return present(row);
}
