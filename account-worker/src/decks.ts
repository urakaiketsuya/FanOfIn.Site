import { versionFromRow, sourceFromRow, decodeStoredJson, type DeckHeaderRow, type SourceRow, type VersionRow } from "./deck-queries";
import { databaseBatch } from "./database";
import { saveDeckContent } from "./deck-save";
export { saveDeck } from "./deck-persistence";
import { canonicalMaybeboard, normalizeDeckTags, validMaybeboard } from "./deck-input";
import {
  type DeckFormat,
  type OmnidexDecklist,
  type OmnidexDecklistCardLine,
  type PublicDeck,
  type SavedDeck,
  type SavedDeckDetail,
} from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { assertAllowedText, validUserFacingName } from "./content-policy";
import { ApiError, badRequest } from "./errors";

const MAX_PRIMER_LENGTH = 50_000;

export async function listDecks(env: Env, user: AuthUser): Promise<SavedDeck[]> {
  const [decks, sources] = await databaseBatch<Record<string, string | null>>(env.ACCOUNT_DB, "deck.library", [
    env.ACCOUNT_DB.prepare(`SELECT sd.*, cb.decklist_json AS current_decklist_json FROM saved_decks sd
      LEFT JOIN user_decks ud ON ud.id = sd.id AND ud.owner_user_id = sd.user_id
      LEFT JOIN deck_versions dv ON dv.id = ud.current_version_id AND dv.deck_id = ud.id
      LEFT JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
      WHERE sd.user_id = ? ORDER BY sd.updated_at DESC`).bind(user.id),
    env.ACCOUNT_DB.prepare(`SELECT s.* FROM saved_deck_sources s JOIN saved_decks sd ON sd.id = s.saved_deck_id
      WHERE sd.user_id = ? ORDER BY s.imported_at DESC`).bind(user.id),
  ]);
  const sourcesByDeckId = new Map<string, Record<string, string | null>[]>();
  for (const source of sources.results) {
    const rows = sourcesByDeckId.get(source.saved_deck_id!) ?? [];
    rows.push(source);
    sourcesByDeckId.set(source.saved_deck_id!, rows);
  }
  const output: SavedDeck[] = [];
  for (const row of decks.results) {
    const sources = sourcesByDeckId.get(row.id!) ?? [];
    const base = JSON.parse(row.decklist_json!) as OmnidexDecklist;
    const newestSideboard = sources[0]?.sideboard_json ? JSON.parse(sources[0].sideboard_json) : [];
    output.push({
      id: row.id!, identityHash: row.identity_hash!, title: row.title!, format: row.format as DeckFormat,
      championName: row.champion_name, decklist: row.current_decklist_json ? JSON.parse(row.current_decklist_json) as OmnidexDecklist : { ...base, sideboard: newestSideboard }, createdAt: row.created_at!, updatedAt: row.updated_at!,
      sources: sources.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
        externalDeckId: source.external_deck_id!, sourceUrl: source.source_url, label: source.label!, metadata: JSON.parse(source.metadata_json!),
        sideboard: JSON.parse(source.sideboard_json!), importedAt: source.imported_at! })),
    });
  }
  return output;
}

export async function renameDeck(env: Env, user: AuthUser, deckId: string, title: string): Promise<boolean> {
  return updateDeckMetadata(env, user, deckId, { title });
}

export async function updateDeckMetadata(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<boolean> {
  if (!value || typeof value !== "object") throw badRequest("Invalid deck metadata");
  const input = value as { title?: unknown; description?: unknown; primerMarkdown?: unknown; tags?: unknown; maybeboard?: unknown };
  if (input.title != null && (typeof input.title !== "string" || !input.title.trim() || input.title.length > 160)) throw badRequest("A valid title is required");
  if (typeof input.title === "string" && !validUserFacingName(input.title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  if (input.description != null && (typeof input.description !== "string" || input.description.length > 2_000)) throw badRequest("Description is too long");
  if (input.primerMarkdown != null && (typeof input.primerMarkdown !== "string" || input.primerMarkdown.length > MAX_PRIMER_LENGTH)) throw badRequest("Primer is too long");
  assertAllowedText(input.description, "Description");
  assertAllowedText(input.primerMarkdown, "Primer");
  const tags = input.tags === undefined ? null : normalizeDeckTags(input.tags);
  if (input.maybeboard !== undefined && !validMaybeboard(input.maybeboard)) throw badRequest("Invalid maybeboard");
  if (input.title === undefined && input.description === undefined && input.primerMarkdown === undefined && tags === null && input.maybeboard === undefined) throw badRequest("No deck metadata was provided");
  const now = new Date().toISOString();
  const title = typeof input.title === "string" ? input.title.trim() : null;
  const description = typeof input.description === "string" ? input.description.trim() : null;
  const primerMarkdown = typeof input.primerMarkdown === "string" ? input.primerMarkdown.trim() : null;
  const tagsJson = tags ? JSON.stringify(tags) : null;
  // Mirror every draft-field change onto the published snapshot too, but only for decks that are
  // already public/unlisted — private decks have nothing published to sync (see createDeckVersion
  // for the matching decklist-side fix).
  const statements = [env.ACCOUNT_DB.prepare(`UPDATE user_decks SET title = COALESCE(?, title), description = COALESCE(?, description),
    primer_markdown = COALESCE(?, primer_markdown), tags_json = COALESCE(?, tags_json), maybeboard_json = COALESCE(?, maybeboard_json),
    published_title = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_title) ELSE published_title END,
    published_description = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_description) ELSE published_description END,
    published_primer_markdown = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_primer_markdown) ELSE published_primer_markdown END,
    published_tags_json = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_tags_json) ELSE published_tags_json END,
    updated_at = ? WHERE id = ? AND owner_user_id = ?`)
    .bind(title, description, primerMarkdown, tagsJson,
      input.maybeboard === undefined ? null : JSON.stringify(canonicalMaybeboard(input.maybeboard)),
      title, description, primerMarkdown, tagsJson,
      now, deckId, user.id)];
  if (title) statements.push(env.ACCOUNT_DB.prepare("UPDATE saved_decks SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(title, now, deckId, user.id));
  const result = await databaseBatch(env.ACCOUNT_DB, "deck.metadata", statements);
  return Boolean(result[0].meta.changes);
}

export async function publishDeck(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<{ publicSlug: string | null; visibility: "private" | "unlisted" | "public" }> {
  if (!value || typeof value !== "object") throw badRequest("Invalid publishing settings");
  const visibility = (value as { visibility?: unknown }).visibility;
  if (visibility !== "private" && visibility !== "unlisted" && visibility !== "public") throw badRequest("Invalid deck visibility");
  const deck = await env.ACCOUNT_DB.prepare("SELECT public_slug, current_version_id, title, description, primer_markdown, tags_json FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ public_slug: string | null; current_version_id: string | null; title: string; description: string; primer_markdown: string; tags_json: string }>();
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  if (!deck.current_version_id) throw badRequest("Deck has no version to publish");
  if (visibility !== "private") {
    assertAllowedText(deck.title, "Deck name");
    assertAllowedText(deck.description, "Description");
    assertAllowedText(deck.primer_markdown, "Primer");
    normalizeDeckTags(JSON.parse(deck.tags_json));
  }
  const slug = deck.public_slug ?? crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  if (visibility === "private") {
    await env.ACCOUNT_DB.prepare("UPDATE user_decks SET visibility = 'private', updated_at = ? WHERE id = ? AND owner_user_id = ?")
      .bind(now, deckId, user.id).run();
  } else {
    await env.ACCOUNT_DB.prepare(`UPDATE user_decks SET public_slug = ?, visibility = ?, published_version_id = current_version_id,
      published_title = title, published_description = description, published_primer_markdown = primer_markdown,
      published_tags_json = tags_json, published_at = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?`)
      .bind(slug, visibility, now, now, deckId, user.id).run();
  }
  return { publicSlug: visibility === "private" ? deck.public_slug : slug, visibility };
}

export async function getPublicDeck(env: Env, publicSlug: string): Promise<PublicDeck | null> {
  if (!/^[a-f0-9]{32}$/.test(publicSlug)) return null;
  const row = await env.ACCOUNT_DB.prepare(`SELECT ud.is_seed, ud.public_slug, ud.published_title, ud.published_description, ud.published_primer_markdown,
    ud.published_tags_json, ud.visibility, ud.published_at,
    ud.updated_at, users.display_name, users.profile_slug, dv.version_number, cb.format, cb.champion_name, cb.decklist_json,
    (SELECT COUNT(*) FROM deck_likes dl WHERE dl.deck_id = ud.id) AS like_count
    FROM user_decks ud
    JOIN users ON users.id = ud.owner_user_id
    JOIN deck_versions dv ON dv.id = ud.published_version_id AND dv.deck_id = ud.id
    JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE ud.public_slug = ? AND ud.visibility IN ('public', 'unlisted') AND ud.moderation_status = 'active'`)
    .bind(publicSlug).first<Record<string, string | null>>();
  if (!row) return null;
  return {
    publicSlug: row.public_slug!, title: row.published_title!, description: row.published_description!,
    primerMarkdown: row.published_primer_markdown ?? "", tags: JSON.parse(row.published_tags_json ?? "[]") as string[],
    visibility: row.visibility as "public" | "unlisted", format: row.format as DeckFormat,
    championName: row.champion_name, decklist: JSON.parse(row.decklist_json!) as OmnidexDecklist,
    versionNumber: Number(row.version_number), publishedAt: row.published_at!, updatedAt: row.updated_at!,
    owner: { displayName: row.display_name!, profileSlug: row.profile_slug! },
    isSeed: Number(row.is_seed ?? 0) === 1,
    likeCount: Number(row.like_count ?? 0),
  };
}

export async function getDeck(env: Env, user: AuthUser, deckId: string, compactHistory = true): Promise<SavedDeckDetail | null> {
  const results = await databaseBatch<DeckHeaderRow | SourceRow | VersionRow>(env.ACCOUNT_DB, "deck.detail", [
    env.ACCOUNT_DB.prepare(`SELECT ud.*, sd.identity_hash, (SELECT COUNT(*) FROM deck_versions WHERE deck_id = ud.id) AS version_count
      FROM user_decks ud JOIN saved_decks sd ON sd.id = ud.id WHERE ud.id = ? AND ud.owner_user_id = ?`).bind(deckId, user.id),
    env.ACCOUNT_DB.prepare(`SELECT s.* FROM saved_deck_sources s JOIN user_decks ud ON ud.id = s.saved_deck_id
      WHERE ud.id = ? AND ud.owner_user_id = ? ORDER BY s.imported_at DESC`).bind(deckId, user.id),
    env.ACCOUNT_DB.prepare(`SELECT dv.*, cb.format, cb.champion_name,
      CASE WHEN ${compactHistory ? "0" : "1"} = 1 OR dv.version_number >= (SELECT MAX(version_number) - 1 FROM deck_versions WHERE deck_id = ud.id)
        THEN cb.decklist_json ELSE NULL END AS decklist_json
      FROM deck_versions dv JOIN user_decks ud ON ud.id = dv.deck_id JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
      WHERE ud.id = ? AND ud.owner_user_id = ? ORDER BY dv.version_number DESC LIMIT ${compactHistory ? 21 : 200}`).bind(deckId, user.id),
  ]);
  const deck = results[0].results[0] as DeckHeaderRow | undefined;
  if (!deck) return null;
  const sources = results[1].results as SourceRow[];
  const versions = (results[2].results.slice(0, compactHistory ? 20 : 200) as VersionRow[]).map(versionFromRow);
  const current = versions.find(version => version.id === deck.current_version_id);
  if (!current?.decklist) throw new Error("Current deck version is missing");
  return {
    revision: Number(deck.revision), id: deck.id!, identityHash: deck.identity_hash!, title: deck.title!, description: deck.description!, primerMarkdown: deck.primer_markdown ?? "",
    tags: decodeStoredJson<string[]>(deck.tags_json, "deck tags"),
    visibility: deck.visibility as SavedDeckDetail["visibility"], publicSlug: deck.public_slug,
    currentVersionId: current.id, publishedVersionId: deck.published_version_id,
    maybeboard: decodeStoredJson<OmnidexDecklistCardLine[]>(deck.maybeboard_json, "maybeboard"),
    format: deck.format as DeckFormat, championName: deck.champion_name, decklist: current.decklist!,
    versions, nextVersionBefore: compactHistory && results[2].results.length > 20 ? versions[versions.length - 1].versionNumber : null, versionCount: Number(deck.version_count), createdAt: deck.created_at!, updatedAt: deck.updated_at!,
    sources: sources.map(sourceFromRow),
  };
}

export async function createDeckVersion(env: Env, user: AuthUser, deckId: string, value: unknown) {
  return saveDeckContent(env, user, deckId, value, "version");
}

export async function updateDeckDecklist(env: Env, user: AuthUser, deckId: string, value: unknown) {
  return saveDeckContent(env, user, deckId, value, "update");
}

export async function restoreDeckVersion(env: Env, user: AuthUser, deckId: string, versionId: string, options: unknown = {}): Promise<{ id: string; versionNumber: number }> {
  const source = await env.ACCOUNT_DB.prepare(`SELECT cb.decklist_json, cb.format, cb.champion_name
    FROM deck_versions dv JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    JOIN user_decks ud ON ud.id = dv.deck_id
    WHERE dv.id = ? AND dv.deck_id = ? AND ud.owner_user_id = ?`)
    .bind(versionId, deckId, user.id).first<{ decklist_json: string; format: DeckFormat; champion_name: string | null }>();
  if (!source) throw new ApiError("Deck version not found", 404, "deck_version_not_found");
  if (!options || typeof options !== "object") throw badRequest("Invalid restore request");
  const { requestId, expectedRevision } = options as { requestId?: unknown; expectedRevision?: unknown };
  return createDeckVersion(env, user, deckId, { requestId, expectedRevision, decklist: JSON.parse(source.decklist_json), format: source.format,
    championName: source.champion_name, changeNote: "Restored an earlier version" });
}

export async function deleteDeck(env: Env, user: AuthUser, deckId: string): Promise<boolean> {
  const owned = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE id = ? AND user_id = ?")
    .bind(deckId, user.id).first<{ id: string }>();
  if (!owned) return false;
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("DELETE FROM user_decks WHERE id = ? AND owner_user_id = ?").bind(deckId, user.id),
    env.ACCOUNT_DB.prepare("DELETE FROM saved_decks WHERE id = ? AND user_id = ?").bind(deckId, user.id),
  ]);
  return true;
}
