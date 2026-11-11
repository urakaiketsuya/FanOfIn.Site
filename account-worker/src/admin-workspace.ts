import { decodePackage, encodePackage, type EditorialPackage, type EditorialPackageInput, type SharedPackage, type PackageResearchReview } from '@gatcg/shared';
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
interface PackageRow { research_json: string | null; id: string; definition_json: string; status: 'draft' | 'published'; revision: number; updated_at: string }
function present(row: PackageRow): EditorialPackage {
  return { id: row.id, definition: JSON.parse(row.definition_json), status: row.status, revision: row.revision, updatedAt: row.updated_at, ...(row.research_json ? { research: JSON.parse(row.research_json) } : {}) };
}
export async function listEditorialPackages(env: Env, publishedOnly = false) {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT id, definition_json, status, revision, updated_at, research_json FROM editorial_packages ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY updated_at DESC, id`).all<PackageRow>();
  return rows.results.map(row => present(publishedOnly ? { ...row, research_json: null } : row));
}
export function parseEditorialPackage(value: unknown): EditorialPackageInput {
  if (!value || typeof value !== 'object') throw badRequest('Invalid package');
  const body = value as Record<string, unknown>;
  if (body.status !== 'draft' && body.status !== 'published') throw badRequest('Invalid publication status');
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw badRequest('Invalid revision');
  const raw = body.definition as SharedPackage | undefined;
  if (!raw || raw.v !== 1 || !Array.isArray(raw.cards) || raw.cards.some(card => !card || (card.section !== 'main' && card.section !== 'material' && card.section !== 'sideboard') || typeof card.name !== 'string' || card.name !== card.name.trim())) throw badRequest('Invalid card list');
  let definition: SharedPackage | null = null;
  try { definition = decodePackage(encodePackage(body.definition as SharedPackage)); } catch { /* Invalid shape. */ }
  if (!definition) throw badRequest('Add 1–60 card lines with 1–4 copies each');
  definition.name = normalizeDisplayText(definition.name, 'Package name', 80, true);
  if (definition.champion) definition.champion = normalizeDisplayText(definition.champion, 'Champion', 80, true);
  let research: PackageResearchReview | undefined;
  if (body.research !== undefined) {
    const raw = body.research as PackageResearchReview;
    if (!raw || !['suggested', 'win-rate', 'experimental', 'construction'].includes(raw.kind) ||
        typeof raw.key !== 'string' || !/^[a-f0-9]{64}$/.test(raw.key) ||
        typeof raw.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(raw.fingerprint) || typeof raw.dismissed !== 'boolean') throw badRequest('Invalid research reference');
    if (raw.dismissed && body.status === 'published') throw badRequest('Dismissed research cannot be published');
    research = { kind: raw.kind, key: raw.key, fingerprint: raw.fingerprint, dismissed: raw.dismissed };
  }
  return { definition, status: body.status, revision: Number(body.revision), ...(research ? { research } : {}) };
}
export async function saveEditorialPackage(env: Env, user: AuthUser, id: string, value: unknown) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw badRequest('Invalid package identifier');
  const input = parseEditorialPackage(value);
  if (input.research && id !== `research-${input.research.key}`) throw badRequest('Research identifier does not match');
  if (id.startsWith('research-') && !input.research) throw badRequest('Research reference is required');
  const researchJson = input.research ? JSON.stringify(input.research) : null;
  const json = JSON.stringify(input.definition);
  const now = new Date().toISOString();
  // One conditional write creates or replaces the complete resource. Retried identical saves are harmless.
  const written = input.revision === 0
    ? await env.ACCOUNT_DB.prepare(`INSERT INTO editorial_packages (id, definition_json, status, revision, updated_by, created_at, updated_at, research_json) VALUES (?, ?, ?, 1, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING id, definition_json, status, revision, updated_at, research_json`).bind(id, json, input.status, user.id, now, now, researchJson).first<PackageRow>()
    : await env.ACCOUNT_DB.prepare(`UPDATE editorial_packages SET definition_json=?, status=?, research_json=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=? AND (research_json IS NULL OR json_extract(research_json, '$.kind')=?) RETURNING id, definition_json, status, revision, updated_at, research_json`).bind(json, input.status, researchJson, user.id, now, id, input.revision, input.research?.kind ?? null).first<PackageRow>();
  if (written) return present(written);
  const row = await env.ACCOUNT_DB.prepare('SELECT id, definition_json, status, revision, updated_at, research_json FROM editorial_packages WHERE id=?').bind(id).first<PackageRow>();
  if (!row || (row.revision !== input.revision + 1 || row.definition_json !== json || row.status !== input.status || row.research_json !== researchJson)) throw new ApiError('This package changed elsewhere. Reload the saved version before editing again.', 409, 'revision_conflict');
  return present(row);
}
