import type { MatchLogRecord } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { badRequest } from "./errors";

function parseRecord(value: unknown): MatchLogRecord {
  if (!value || typeof value !== "object") throw badRequest("Invalid match record");
  const record = value as MatchLogRecord;
  if (record.version !== 1 || typeof record.id !== "string" || record.id.length < 1 || record.id.length > 200
    || typeof record.playedAt !== "string" || Number.isNaN(Date.parse(record.playedAt))
    || !["win", "loss", "draw"].includes(record.result) || !["first", "second", "unknown"].includes(record.order)
    || !record.provenance || !["manual", "clarent"].includes(record.provenance.kind)) throw badRequest("Invalid match record");
  const encoded = JSON.stringify(record);
  if (encoded.length > 64_000) throw badRequest("Match record is too large");
  return JSON.parse(encoded) as MatchLogRecord;
}

export async function listMatchLog(env: Env, user: AuthUser, savedDeckId?: string | null): Promise<MatchLogRecord[]> {
  const query = savedDeckId
    ? env.ACCOUNT_DB.prepare("SELECT payload_json, saved_deck_id FROM match_log_records WHERE user_id = ? AND saved_deck_id = ? ORDER BY played_at DESC").bind(user.id, savedDeckId)
    : env.ACCOUNT_DB.prepare("SELECT payload_json, saved_deck_id FROM match_log_records WHERE user_id = ? ORDER BY played_at DESC").bind(user.id);
  const rows = await query.all<{ payload_json: string; saved_deck_id: string | null }>();
  return rows.results.flatMap((row) => { try { return [{ ...parseRecord(JSON.parse(row.payload_json)), savedDeckId: row.saved_deck_id }]; } catch { return []; } });
}

export async function upsertMatchLog(env: Env, user: AuthUser, input: unknown): Promise<{ saved: number }> {
  const body = input && typeof input === "object" ? input as { records?: unknown } : {};
  if (!Array.isArray(body.records) || body.records.length > 500) throw badRequest("Provide no more than 500 match records");
  const records = body.records.map(parseRecord);
  const now = new Date().toISOString();
  for (const record of records) {
    if (record.savedDeckId) {
      const owned = await env.ACCOUNT_DB.prepare("SELECT 1 FROM user_decks WHERE id = ? AND owner_user_id = ?").bind(record.savedDeckId, user.id).first();
      if (!owned) throw badRequest("A match references a deck outside this account");
    }
    await env.ACCOUNT_DB.prepare(`INSERT INTO match_log_records
      (user_id, id, saved_deck_id, played_at, provenance_kind, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, id) DO UPDATE SET saved_deck_id = excluded.saved_deck_id, played_at = excluded.played_at,
        provenance_kind = excluded.provenance_kind, payload_json = excluded.payload_json, updated_at = excluded.updated_at`)
      .bind(user.id, record.id, record.savedDeckId ?? null, record.playedAt, record.provenance.kind, JSON.stringify(record), now, now).run();
  }
  return { saved: records.length };
}

export async function deleteMatchLogRecord(env: Env, user: AuthUser, id: string): Promise<boolean> {
  return (await env.ACCOUNT_DB.prepare("DELETE FROM match_log_records WHERE user_id = ? AND id = ?").bind(user.id, id).run()).meta.changes > 0;
}
