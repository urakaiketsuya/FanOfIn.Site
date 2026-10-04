import { withDeckPrintings } from "@gatcg/shared";
import type { DeckFormat, OmnidexDecklist, SavedDeckVersion, SavedDeckSource, DeckVisibility } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError } from "./errors";

export interface DeckHeaderRow {
  id: string; identity_hash: string; title: string; description: string; primer_markdown: string;
  tags_json: string; maybeboard_json: string; revision: number; version_count: number;
  visibility: DeckVisibility; public_slug: string | null; current_version_id: string;
  published_version_id: string | null; format: DeckFormat; champion_name: string | null;
  created_at: string; updated_at: string;
}
export interface SourceRow {
  id: string; provider: SavedDeckSource["provider"]; external_deck_id: string;
  source_url: string | null; label: string; metadata_json: string; sideboard_json: string; imported_at: string;
}
export function sourceFromRow(row: SourceRow): SavedDeckSource {
  return { id: row.id, provider: row.provider, externalDeckId: row.external_deck_id, sourceUrl: row.source_url,
    label: row.label, metadata: decodeStoredJson(row.metadata_json, "source metadata"),
    sideboard: decodeStoredJson(row.sideboard_json, "source sideboard"), importedAt: row.imported_at };
}
export interface VersionRow {
  printings_json?: string; id: string; version_number: number; decklist_json: string | null; format: DeckFormat;
  champion_name: string | null; change_note: string; change_summary_json: string; created_at: string;
}
export function decodeStoredJson<T>(value: string, field: string): T {
  try { return JSON.parse(value) as T; }
  catch { throw new Error(`Invalid stored ${field}`); }
}
export function versionFromRow(row: VersionRow): SavedDeckVersion {
  return { id: row.id, versionNumber: row.version_number,
    ...(row.decklist_json === null ? {} : { decklist: withDeckPrintings(decodeStoredJson<OmnidexDecklist>(row.decklist_json, "decklist"), JSON.parse(row.printings_json ?? "{}")) }),
    format: row.format, championName: row.champion_name, changeNote: row.change_note,
    changeSummary: decodeStoredJson<Record<string, unknown>>(row.change_summary_json, "version summary"), createdAt: row.created_at };
}
export async function getOwnedVersion(env: Env, user: AuthUser, deckId: string, versionId: string): Promise<SavedDeckVersion> {
  const row = await env.ACCOUNT_DB.prepare(`SELECT dv.*, cb.decklist_json, cb.format, cb.champion_name
    FROM deck_versions dv JOIN user_decks ud ON ud.id = dv.deck_id JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE dv.id = ? AND dv.deck_id = ? AND ud.owner_user_id = ?`).bind(versionId, deckId, user.id).first<VersionRow>();
  if (!row) throw new ApiError("Deck version not found", 404, "deck_version_not_found");
  return versionFromRow(row);
}
export async function getOwnedHistory(env: Env, user: AuthUser, deckId: string, before = 2147483647) {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT dv.*, NULL AS decklist_json, cb.format, cb.champion_name
    FROM deck_versions dv JOIN user_decks ud ON ud.id = dv.deck_id JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE dv.deck_id = ? AND ud.owner_user_id = ? AND dv.version_number < ? ORDER BY dv.version_number DESC LIMIT 21`)
    .bind(deckId, user.id, before).all<VersionRow>();
  const versions = rows.results.slice(0, 20).map(versionFromRow);
  return { versions, nextBefore: rows.results.length > 20 ? versions[versions.length - 1].versionNumber : null };
}
