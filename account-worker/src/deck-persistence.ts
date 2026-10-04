import { validateDeckPrintings } from "./printing-catalog";
import { databaseBatch } from "./database";
import { translateDeckWriteError } from "./deck-save";
import { extractDeckPrintings, canonicalizeSavedDecklist } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { canonicalMaybeboard, fullIdentityHash, identityHash, type SaveInput } from "./deck-input";
import { validUserFacingName } from "./content-policy";
import { badRequest } from "./errors";

const MAX_DECKS_PER_USER = 250;
const MAX_SOURCES_PER_DECK = 50;

async function initialDeckStatements(env: Env, user: AuthUser, deckId: string, input: SaveInput, coreHash: string, now: string): Promise<D1PreparedStatement[]> {
  const existing = await env.ACCOUNT_DB.prepare("SELECT id FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ id: string }>();
  if (existing) return [];
  const canonical = canonicalizeSavedDecklist(input.decklist);
  const format = input.format ?? "UNKNOWN";
  const fullHash = await fullIdentityHash(canonical, format, input.championName ?? null);
  const buildId = fullHash;
  const versionId = crypto.randomUUID();
  const statements = [env.ACCOUNT_DB.prepare(`INSERT INTO canonical_builds (id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(full_identity_hash) DO NOTHING`)
    .bind(buildId, coreHash, fullHash, format, input.championName ?? null, JSON.stringify(canonical), now)];
  const title = input.title.trim();
  // New decks publish themselves immediately (visibility defaults to public) rather than
  // starting private and requiring an explicit publish step — mirrors publishDeck's own
  // public-path fields below so the first version is visible right away.
  const publicSlug = crypto.randomUUID().replace(/-/g, "");
  statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO user_decks
    (id, owner_user_id, title, description, visibility, public_slug, published_title, published_description, published_primer_markdown, published_tags_json, format, champion_name, created_at, updated_at)
    VALUES (?, ?, ?, '', 'public', ?, ?, '', '', '[]', ?, ?, ?, ?)`)
    .bind(deckId, user.id, title, publicSlug, title, format, input.championName ?? null, now, now));
  statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO deck_versions
    (id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at, printings_json)
    VALUES (?, ?, 1, (SELECT id FROM canonical_builds WHERE full_identity_hash = ?), 'Initial version', '{}', ?, ?)`)
    .bind(versionId, deckId, fullHash, now, JSON.stringify(extractDeckPrintings(input.decklist))));
  statements.push(env.ACCOUNT_DB.prepare("UPDATE user_decks SET current_version_id = ?, published_version_id = ?, published_at = ? WHERE id = ? AND owner_user_id = ?")
    .bind(versionId, versionId, now, deckId, user.id));
  return statements;
}

export async function saveDeck(env: Env, user: AuthUser, input: SaveInput): Promise<{ id: string; created: boolean }> {
  await validateDeckPrintings(env, extractDeckPrintings({ ...input.decklist, maybeboard: input.maybeboard }));
  return saveDeckAttempt(env, user, input, true);
}

async function saveDeckAttempt(env: Env, user: AuthUser, input: SaveInput, retryConflict: boolean): Promise<{ id: string; created: boolean }> {
  if (!validUserFacingName(input.title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  const canonical = canonicalizeSavedDecklist(input.decklist);
  if (canonical.main.length + canonical.material.length === 0) throw badRequest("A deck needs main or material cards");
  const hash = await identityHash(canonical);
  const now = new Date().toISOString();
  const existing = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE user_id = ? AND identity_hash = ?").bind(user.id, hash).first<{ id: string }>();
  if (!existing) {
    const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM saved_decks WHERE user_id = ?").bind(user.id).first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_DECKS_PER_USER) throw badRequest(`Saved deck limit of ${MAX_DECKS_PER_USER} reached`, "deck_limit_reached");
  }
  const deckId = existing?.id ?? crypto.randomUUID();
  const statements = [env.ACCOUNT_DB.prepare(`INSERT INTO saved_decks (id, user_id, identity_hash, title, format, champion_name, decklist_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, identity_hash) DO UPDATE SET updated_at = excluded.updated_at`)
    .bind(deckId, user.id, hash, input.title.trim(), input.format ?? "UNKNOWN", input.championName ?? null, JSON.stringify({ ...canonical, sideboard: [] }), now, now)];
  const existingSource = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_deck_sources WHERE saved_deck_id = ? AND provider = ? AND external_deck_id = ?")
    .bind(deckId, input.source.provider, input.source.externalDeckId).first<{ id: string }>();
  if (!existingSource) {
    const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM saved_deck_sources WHERE saved_deck_id = ?").bind(deckId).first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_SOURCES_PER_DECK) throw badRequest(`Deck source limit of ${MAX_SOURCES_PER_DECK} reached`, "deck_source_limit_reached");
  }
  statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO saved_deck_sources (id, saved_deck_id, provider, external_deck_id, source_url, label, metadata_json, sideboard_json, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(saved_deck_id, provider, external_deck_id) DO UPDATE SET source_url = excluded.source_url,
      label = excluded.label, metadata_json = excluded.metadata_json, sideboard_json = excluded.sideboard_json, imported_at = excluded.imported_at`)
    .bind(crypto.randomUUID(), deckId, input.source.provider, input.source.externalDeckId, input.source.sourceUrl ?? null,
      input.source.label.slice(0, 240), JSON.stringify(input.source.metadata ?? {}), JSON.stringify(canonical.sideboard), now));
  statements.push(...await initialDeckStatements(env, user, deckId, input, hash, now));
  if (input.maybeboard !== undefined) {
    statements.push(env.ACCOUNT_DB.prepare("UPDATE user_decks SET maybeboard_json = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?")
      .bind(JSON.stringify(canonicalMaybeboard(input.maybeboard)), now, deckId, user.id));
  }
  try {
    await databaseBatch(env.ACCOUNT_DB, "deck.create", statements);
  } catch (error) {
    // A concurrent first save can win the identity constraint after our read.
    // The failed batch rolls back; retry once using the winner's persisted ID.
    if (retryConflict && !existing) {
      const winner = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE user_id = ? AND identity_hash = ?")
        .bind(user.id, hash).first<{ id: string }>();
      if (winner && winner.id !== deckId) return saveDeckAttempt(env, user, input, false);
    }
    translateDeckWriteError(error);
  }
  return { id: deckId, created: !existing };
}

