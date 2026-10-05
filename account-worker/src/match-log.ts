import { validateMatchLogRecord, type MatchLogRecord } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { badRequest } from "./errors";

export function parseMatchLogRecord(value: unknown): MatchLogRecord {
  try { return validateMatchLogRecord(value); }
  catch (error) { throw badRequest(error instanceof Error ? error.message : "Invalid match record"); }
}

export async function listMatchLog(env: Env, user: AuthUser, savedDeckId?: string | null): Promise<MatchLogRecord[]> {
  const query = savedDeckId
    ? env.ACCOUNT_DB.prepare("SELECT payload_json, saved_deck_id FROM match_log_records WHERE user_id = ? AND saved_deck_id = ? ORDER BY played_at DESC").bind(user.id, savedDeckId)
    : env.ACCOUNT_DB.prepare("SELECT payload_json, saved_deck_id FROM match_log_records WHERE user_id = ? ORDER BY played_at DESC").bind(user.id);
  const rows = await query.all<{ payload_json: string; saved_deck_id: string | null }>();
  return rows.results.flatMap((row) => {
    try {
      const payload = JSON.parse(row.payload_json);
      payload.savedDeckId = row.saved_deck_id;
      if (!row.saved_deck_id && payload.provenance?.kind === "clarent") delete payload.provenance.deckMapping;
      return [parseMatchLogRecord(payload)];
    } catch { return []; }
  });
}

export async function upsertMatchLog(env: Env, user: AuthUser, input: unknown): Promise<{ saved: number }> {
  const body = input && typeof input === "object" ? input as { records?: unknown } : {};
  if (!Array.isArray(body.records) || body.records.length > 500) throw badRequest("Provide no more than 500 match records");
  const records = body.records.map(parseMatchLogRecord);
  if (new Set(records.map(record => record.id)).size !== records.length) throw badRequest("Duplicate match IDs in this import");
  const now = new Date().toISOString();
  for (const record of records) {
    if (record.savedDeckId) {
      const owned = await env.ACCOUNT_DB.prepare("SELECT 1 FROM user_decks WHERE id = ? AND owner_user_id = ?").bind(record.savedDeckId, user.id).first();
      if (!owned) throw badRequest("A match references a deck outside this account");
    }
  }
  const statements = records.map(record => env.ACCOUNT_DB.prepare(`INSERT INTO match_log_records
      (user_id, id, saved_deck_id, played_at, provenance_kind, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, id) DO UPDATE SET saved_deck_id = excluded.saved_deck_id, played_at = excluded.played_at,
        provenance_kind = excluded.provenance_kind, payload_json = excluded.payload_json, updated_at = excluded.updated_at`)
      .bind(user.id, record.id, record.savedDeckId ?? null, record.playedAt, record.provenance.kind, JSON.stringify(record), now, now));
  try { if (statements.length) await env.ACCOUNT_DB.batch(statements); }
  catch (error) {
    if (String(error).includes("Match was deleted")) throw badRequest("A game was deleted on another device. Refresh your log before importing it again.");
    throw error;
  }
  return { saved: records.length };
}

export async function deleteMatchLogRecord(env: Env, user: AuthUser, id: string): Promise<boolean> {
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("INSERT OR IGNORE INTO match_log_deletions (user_id, id) VALUES (?, ?)").bind(user.id, id),
    env.ACCOUNT_DB.prepare("DELETE FROM match_log_records WHERE user_id = ? AND id = ?").bind(user.id, id),
  ]);
  return true;
}
