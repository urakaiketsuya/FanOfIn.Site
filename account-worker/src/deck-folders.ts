import type { DeckFolder, DeckFolderInput } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";
const MAX_FOLDERS = 100;
const missing = () => new ApiError("Folder not found", 404, "folder_not_found");
const conflict = () => new ApiError("This folder changed elsewhere. Reload its saved contents before trying again.", 409, "folder_conflict");
export function parseFolderInput(value: unknown): DeckFolderInput {
  if (!value || typeof value !== "object") throw badRequest("Invalid folder");
  const { name, deckIds } = value as Record<string, unknown>;
  if (typeof name !== "string") throw badRequest("Enter a folder name");
  const normalized = name.normalize("NFKC").trim();
  if (!normalized || normalized.length > 60 || /[\u0000-\u001f\u007f]/.test(normalized)) throw badRequest("Folder names must contain 1–60 characters without control characters");
  if (!Array.isArray(deckIds) || deckIds.length > 500 || deckIds.some(id => typeof id !== "string" || !id || id.length > 100)) throw badRequest("Choose up to 500 saved decks");
  return { name: normalized, deckIds: [...new Set(deckIds as string[])].sort() };
}
function revisionOf(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw badRequest("Invalid folder revision");
  return Number(value);
}
function validId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) throw badRequest("Invalid folder ID");
}
export async function listDeckFolders(env: Env, user: AuthUser): Promise<DeckFolder[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT f.id, f.name, f.revision, f.created_at, f.updated_at, d.id AS deck_id
    FROM deck_folders f LEFT JOIN deck_folder_members m ON m.folder_id = f.id
    LEFT JOIN saved_decks d ON d.id = m.deck_id AND d.user_id = f.user_id
    WHERE f.user_id = ? ORDER BY f.name_key, f.id, d.id`).bind(user.id)
    .all<{ id: string; name: string; revision: number; created_at: string; updated_at: string; deck_id: string | null }>();
  const folders = new Map<string, DeckFolder>();
  for (const row of rows.results) {
    let folder = folders.get(row.id);
    if (!folder) { folder = { id: row.id, name: row.name, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, deckIds: [] }; folders.set(row.id, folder); }
    if (row.deck_id) folder.deckIds.push(row.deck_id);
  }
  return [...folders.values()];
}

async function ownedDecks(env: Env, user: AuthUser, ids: string[]) {
  const row = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM saved_decks WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))").bind(user.id, JSON.stringify(ids)).first<{ count: number }>();
  if (row?.count !== ids.length) throw badRequest("One or more selected decks are unavailable in your library");
}
function translateConflict(error: unknown): never {
  if (error instanceof Error && error.message.includes("UNIQUE constraint failed: deck_folders.user_id")) throw new ApiError("A folder with this name already exists", 409, "duplicate_folder_name");
  throw error;
}
function insertMembers(env: Env, user: AuthUser, id: string, token: string, ids: string[]) {
  return env.ACCOUNT_DB.prepare(`INSERT INTO deck_folder_members(folder_id, deck_id)
    SELECT f.id, d.id FROM deck_folders f, json_each(?) j JOIN saved_decks d ON d.id = j.value
    WHERE f.id = ? AND f.user_id = ? AND d.user_id = ? AND f.mutation_token = ?`)
    .bind(JSON.stringify(ids), id, user.id, user.id, token);
}
export async function createDeckFolder(env: Env, user: AuthUser, value: unknown): Promise<DeckFolder> {
  const input = parseFolderInput(value);
  const id = (value as { id?: unknown }).id; validId(id);
  const existing = (await listDeckFolders(env, user)).find(folder => folder.id === id);
  // Client-generated IDs make a lost create response safe to retry.
  if (existing) {
    if (existing.name === input.name && JSON.stringify(existing.deckIds) === JSON.stringify(input.deckIds)) return existing;
    throw new ApiError("This folder was already created. Reload your folders to edit it.", 409, "folder_already_created");
  }
  await ownedDecks(env, user, input.deckIds);
  const token = crypto.randomUUID(), now = new Date().toISOString();
  let result;
  try {
    result = await env.ACCOUNT_DB.batch([
      env.ACCOUNT_DB.prepare(`INSERT INTO deck_folders(id, user_id, name, name_key, mutation_token, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM deck_folders WHERE user_id = ?) < ?
        AND (SELECT COUNT(*) FROM saved_decks WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))) = ?
        ON CONFLICT(id) DO NOTHING`).bind(id, user.id, input.name, input.name.toLowerCase(), token, now, now, user.id, MAX_FOLDERS, user.id, JSON.stringify(input.deckIds), input.deckIds.length),
      insertMembers(env, user, id, token, input.deckIds),
    ]);
  } catch (error) { translateConflict(error); }
  const folder = (await listDeckFolders(env, user)).find(item => item.id === id);
  if (!folder || !result) throw badRequest("Could not create the folder. Refresh your library; you can have up to 100 folders.");
  return folder;
}
export async function updateDeckFolder(env: Env, user: AuthUser, id: string, value: unknown): Promise<DeckFolder> {
  const current = (await listDeckFolders(env, user)).find(folder => folder.id === id);
  if (!current) throw missing();
  const input = parseFolderInput(value);
  const revision = revisionOf((value as { revision?: unknown }).revision);
  if (current.revision !== revision) {
    if (current.name === input.name && JSON.stringify(current.deckIds) === JSON.stringify(input.deckIds)) return current;
    throw conflict();
  }
  await ownedDecks(env, user, input.deckIds);
  const token = crypto.randomUUID();
  let results;
  try {
    results = await env.ACCOUNT_DB.batch([
      env.ACCOUNT_DB.prepare(`UPDATE deck_folders SET name = ?, name_key = ?, revision = revision + 1, mutation_token = ?, updated_at = ?
        WHERE id = ? AND user_id = ? AND revision = ?
        AND (SELECT COUNT(*) FROM saved_decks WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))) = ?`)
        .bind(input.name, input.name.toLowerCase(), token, new Date().toISOString(), id, user.id, revision, user.id, JSON.stringify(input.deckIds), input.deckIds.length),
      env.ACCOUNT_DB.prepare("DELETE FROM deck_folder_members WHERE folder_id IN (SELECT id FROM deck_folders WHERE id = ? AND user_id = ? AND mutation_token = ?)").bind(id, user.id, token),
      insertMembers(env, user, id, token, input.deckIds),
    ]);
  } catch (error) { translateConflict(error); }
  if (results?.[0].meta.changes !== 1) throw conflict();
  const folder = (await listDeckFolders(env, user)).find(item => item.id === id);
  if (!folder) throw missing();
  return folder;
}
export async function deleteDeckFolder(env: Env, user: AuthUser, id: string, revision: unknown): Promise<void> {
  const expected = revisionOf(revision);
  const result = await env.ACCOUNT_DB.prepare("DELETE FROM deck_folders WHERE id = ? AND user_id = ? AND revision = ?").bind(id, user.id, expected).run();
  if (result.meta.changes !== 1) {
    const exists = await env.ACCOUNT_DB.prepare("SELECT id FROM deck_folders WHERE id = ? AND user_id = ?").bind(id, user.id).first();
    if (exists) throw conflict();
    // Idempotent delete, without disclosing another user's folder.
  }
}
