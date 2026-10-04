import { extractDeckPrintings } from "@gatcg/shared";
import { validateDeckPrintings } from "./printing-catalog";
import { databaseBatch } from "./database";
import type { AuthUser, Env } from "./auth";
import { canonicalMaybeboard, parseDeckContent, prepareDeckBuild, validMaybeboard } from "./deck-input";
import { assertAllowedText } from "./content-policy";
import { ApiError, badRequest } from "./errors";

export interface DeckSaveResult { id: string; versionNumber: number; revision: number }
interface DeckState { revision: number; current_version_id: string; version_number: number; full_identity_hash: string; printings_json: string }
const conflict = () => new ApiError("This deck changed elsewhere. Your edits are still available; reload the saved deck before trying again.", 409, "deck_conflict");

export function translateDeckWriteError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("deck_revision_conflict")) throw conflict();
  for (const [code, label] of [["deck_limit_reached", "Saved deck limit of 250 reached"], ["deck_source_limit_reached", "Deck source limit of 50 reached"], ["deck_version_limit_reached", "Version limit of 200 reached"]]) {
    if (message.includes(code)) throw badRequest(label, code);
  }
  if (message.includes("UNIQUE constraint failed: saved_decks.user_id, saved_decks.identity_hash")) throw badRequest("This build already exists in your decks", "owned_duplicate_deck");
  throw error;
}

/** One transaction owns the receipt, canonical build, version, library projection and maybeboard. */
export async function saveDeckContent(env: Env, user: AuthUser, deckId: string, value: unknown, mode: "update" | "version"): Promise<DeckSaveResult> {
  const input = parseDeckContent(value, "Invalid deck save");
  const options = value as { requestId?: unknown; expectedRevision?: unknown; maybeboard?: unknown };
  if (options.requestId !== undefined && (typeof options.requestId !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(options.requestId))) throw badRequest("Invalid save request ID");
  if (options.expectedRevision !== undefined && (!Number.isSafeInteger(options.expectedRevision) || Number(options.expectedRevision) < 0)) throw badRequest("Invalid deck revision");
  if (options.maybeboard !== undefined && !validMaybeboard(options.maybeboard)) throw badRequest("Invalid maybeboard");
  if (input.changeNote != null && (typeof input.changeNote !== "string" || input.changeNote.length > 240)) throw badRequest("Change note is too long");
  assertAllowedText(input.changeNote, "Change note");
  const { canonical, coreHash, fullHash, championName } = await prepareDeckBuild(input);
  const printings = JSON.stringify(extractDeckPrintings(input.decklist));
  const maybeboard = options.maybeboard === undefined ? null : JSON.stringify(canonicalMaybeboard(options.maybeboard));
  const changeNote = typeof input.changeNote === "string" ? input.changeNote.trim() : "";
  const requestId = options.requestId ?? crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ deckId, mode, fullHash, maybeboard, changeNote, revision: options.expectedRevision, ...(printings !== "{}" ? { printings } : {}) })));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  async function receipt(): Promise<DeckSaveResult | null> {
    const row = await env.ACCOUNT_DB.prepare("SELECT request_hash, result_json FROM deck_save_receipts WHERE user_id = ? AND request_id = ?")
      .bind(user.id, requestId).first<{ request_hash: string; result_json: string }>();
    if (!row) return null;
    if (row.request_hash !== hash) throw new ApiError("This request ID was already used for a different save", 409, "request_id_conflict");
    return JSON.parse(row.result_json) as DeckSaveResult;
  }
  const replay = await receipt();
  if (replay) return replay;
  await validateDeckPrintings(env, extractDeckPrintings({ ...input.decklist, maybeboard: options.maybeboard as import("@gatcg/shared").OmnidexDecklistCardLine[] | undefined }));
  const owned = await env.ACCOUNT_DB.prepare(`SELECT ud.revision, ud.current_version_id, dv.version_number, dv.printings_json, cb.full_identity_hash
    FROM user_decks ud JOIN deck_versions dv ON dv.id = ud.current_version_id AND dv.deck_id = ud.id
    JOIN canonical_builds cb ON cb.id = dv.canonical_build_id WHERE ud.id = ? AND ud.owner_user_id = ?`)
    .bind(deckId, user.id).first<DeckState>();
  if (!owned) throw new ApiError("Deck not found", 404, "deck_not_found");
  const expected = options.expectedRevision ?? owned.revision; // Legacy clients still get transaction-time protection.
  if (expected !== owned.revision) { const winner = await receipt(); if (winner) return winner; throw conflict(); }
  if (mode === "version" && owned.full_identity_hash === fullHash && (owned.printings_json ?? "{}") === printings) {
    const winner = await receipt(); if (winner) return winner;
    throw badRequest("This decklist is already the current version", "duplicate_version");
  }
  const latest = mode === "version" ? await env.ACCOUNT_DB.prepare("SELECT MAX(version_number) AS latest FROM deck_versions WHERE deck_id = ?").bind(deckId).first<{ latest: number }>() : null;
  const result = { id: mode === "version" ? crypto.randomUUID() : owned.current_version_id, versionNumber: mode === "version" ? (latest!.latest + 1) : owned.version_number, revision: owned.revision + 1 };
  const now = new Date().toISOString();
  try {
    await databaseBatch(env.ACCOUNT_DB, "deck.save", [
      env.ACCOUNT_DB.prepare("INSERT INTO deck_save_receipts(user_id, request_id, deck_id, request_hash, expected_revision, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(user.id, requestId, deckId, hash, expected, JSON.stringify(result), now),
      env.ACCOUNT_DB.prepare(`INSERT INTO canonical_builds(id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(full_identity_hash) DO NOTHING`)
        .bind(fullHash, coreHash, fullHash, input.format, championName, JSON.stringify(canonical), now),
      mode === "version"
        ? env.ACCOUNT_DB.prepare(`INSERT INTO deck_versions(id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at, printings_json)
          VALUES (?, ?, ?, (SELECT id FROM canonical_builds WHERE full_identity_hash = ?), ?, '{}', ?, ?)`)
          .bind(result.id, deckId, result.versionNumber, fullHash, changeNote, now, printings)
        : env.ACCOUNT_DB.prepare("UPDATE deck_versions SET canonical_build_id = (SELECT id FROM canonical_builds WHERE full_identity_hash = ?), printings_json = ? WHERE id = ? AND deck_id = ?")
          .bind(fullHash, printings, result.id, deckId),
      env.ACCOUNT_DB.prepare(`UPDATE user_decks SET current_version_id = ?, format = ?, champion_name = ?, maybeboard_json = COALESCE(?, maybeboard_json),
        published_version_id = CASE WHEN visibility <> 'private' THEN ? ELSE published_version_id END,
        published_at = CASE WHEN visibility <> 'private' THEN ? ELSE published_at END, updated_at = ? WHERE id = ? AND owner_user_id = ?`)
        .bind(result.id, input.format, championName, maybeboard, result.id, now, now, deckId, user.id),
      env.ACCOUNT_DB.prepare("UPDATE saved_decks SET identity_hash = ?, format = ?, champion_name = ?, decklist_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(coreHash, input.format, championName, JSON.stringify({ ...canonical, sideboard: [] }), now, deckId, user.id),
    ]);
  } catch (error) {
    const winner = await receipt();
    if (winner) return winner;
    translateDeckWriteError(error);
  }
  return result;
}
