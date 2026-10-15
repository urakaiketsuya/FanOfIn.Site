import { parseMerchandiseQuantities, type MerchandiseCollection, type MerchandiseSaveInput } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

interface Row { revision: number; quantities_json: string; request_id: string; expected_revision: number }
const conflict = () => new ApiError("Merchandise changed elsewhere. Load saved quantities and review your draft before saving again.", 409, "merchandise_conflict");
const snapshot = (userId: string, row: Row | null): MerchandiseCollection => ({ userId, revision: row?.revision ?? 0, quantities: row ? JSON.parse(row.quantities_json) : {} });
export async function listMerchandise(env: Env, user: AuthUser) {
  const row = await env.ACCOUNT_DB.prepare("SELECT * FROM merchandise_collections WHERE user_id = ?").bind(user.id).first<Row>();
  return snapshot(user.id, row);
}

export async function saveMerchandise(env: Env, user: AuthUser, value: unknown) {
  const input = value as MerchandiseSaveInput | null;
  if (input?.expectedUserId !== user.id) throw new ApiError("Account changed. Reload before saving merchandise.", 409, "account_changed");
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || typeof input.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) throw badRequest("Invalid merchandise save");
  let quantities: Record<string, number>;
  try { quantities = parseMerchandiseQuantities(input.quantities); } catch { throw badRequest("Invalid merchandise quantities"); }
  const payload = JSON.stringify(quantities);
  // A single conditional statement creates or replaces the entire resource atomically.
  // A retry cannot increment twice, and a stale retry after another save cannot overwrite it.
  const row = await env.ACCOUNT_DB.prepare(`INSERT INTO merchandise_collections (user_id, revision, quantities_json, request_id, expected_revision)
    SELECT ?, 1, ?, ?, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM merchandise_collections WHERE user_id = ?)
    ON CONFLICT(user_id) DO UPDATE SET revision = revision + 1, quantities_json = excluded.quantities_json,
      request_id = excluded.request_id, expected_revision = excluded.expected_revision
    WHERE merchandise_collections.revision = excluded.expected_revision AND merchandise_collections.request_id != excluded.request_id
    RETURNING *`).bind(user.id, payload, input.requestId, input.expectedRevision, input.expectedRevision, user.id).first<Row>();
  if (row) return snapshot(user.id, row);
  const existing = await env.ACCOUNT_DB.prepare("SELECT * FROM merchandise_collections WHERE user_id = ?").bind(user.id).first<Row>();
  if (existing?.request_id === input.requestId && existing.expected_revision === input.expectedRevision && existing.quantities_json === payload) return snapshot(user.id, existing);
  throw conflict();
}
