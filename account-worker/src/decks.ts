export { saveDeck } from "./deck-persistence";
import { canonicalMaybeboard, normalizeDeckTags, validMaybeboard, parseDeckContent, prepareDeckBuild } from "./deck-input";
import {
  type DeckFormat,
  type OmnidexDecklist,
  type OmnidexDecklistCardLine,
  type PublicDeck,
  type SavedDeck,
  type SavedDeckDetail,
  type SavedDeckVersion,
} from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { assertAllowedText, validUserFacingName } from "./content-policy";
import { ApiError, badRequest } from "./errors";

const MAX_VERSIONS_PER_DECK = 200;
const MAX_PRIMER_LENGTH = 50_000;

export async function listDecks(env: Env, user: AuthUser): Promise<SavedDeck[]> {
  const decks = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_decks WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, string | null>>();
  const sourcesByDeckId = new Map<string, Record<string, string | null>[]>();
  if (decks.results.length > 0) {
    // Fetch the library's sources in bounded batches. Imported users can have hundreds of decks; the
    // former query-per-deck path made every library consumer (Analysis, Review, Compare, etc.)
    // wait on an avoidable N+1 sequence and could exceed the client's request timeout.
    const deckIds = decks.results.map((row) => row.id!);
    for (let offset = 0; offset < deckIds.length; offset += 75) {
      const batch = deckIds.slice(offset, offset + 75);
      const placeholders = batch.map(() => "?").join(", ");
      const sources = await env.ACCOUNT_DB.prepare(
        `SELECT * FROM saved_deck_sources WHERE saved_deck_id IN (${placeholders}) ORDER BY imported_at DESC`,
      ).bind(...batch).all<Record<string, string | null>>();
      for (const source of sources.results) {
        const rows = sourcesByDeckId.get(source.saved_deck_id!) ?? [];
        rows.push(source);
        sourcesByDeckId.set(source.saved_deck_id!, rows);
      }
    }
  }
  const output: SavedDeck[] = [];
  for (const row of decks.results) {
    const sources = sourcesByDeckId.get(row.id!) ?? [];
    const base = JSON.parse(row.decklist_json!) as OmnidexDecklist;
    const newestSideboard = sources[0]?.sideboard_json ? JSON.parse(sources[0].sideboard_json) : [];
    output.push({
      id: row.id!, identityHash: row.identity_hash!, title: row.title!, format: row.format as DeckFormat,
      championName: row.champion_name, decklist: { ...base, sideboard: newestSideboard }, createdAt: row.created_at!, updatedAt: row.updated_at!,
      sources: sources.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
        externalDeckId: source.external_deck_id!, sourceUrl: source.source_url, label: source.label!, metadata: JSON.parse(source.metadata_json!),
        sideboard: JSON.parse(source.sideboard_json!), importedAt: source.imported_at! })),
    });
  }
  return output;
}

export async function renameDeck(env: Env, user: AuthUser, deckId: string, title: string): Promise<boolean> {
  if (!validUserFacingName(title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  const result = await env.ACCOUNT_DB.prepare("UPDATE saved_decks SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(title, new Date().toISOString(), deckId, user.id).run();
  if (result.meta.changes) {
    // Decks that are already public/unlisted show live edits on their published link (see
    // ensureVersionedDeck/createDeckVersion) — a rename should be no different, so keep the
    // published snapshot's title in sync rather than leaving the old one stuck on the public page.
    await env.ACCOUNT_DB.prepare(`UPDATE user_decks SET title = ?,
      published_title = CASE WHEN visibility <> 'private' THEN ? ELSE published_title END, updated_at = ?
      WHERE id = ? AND owner_user_id = ?`)
      .bind(title, title, new Date().toISOString(), deckId, user.id).run();
  }
  return Boolean(result.meta.changes);
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
  const result = await env.ACCOUNT_DB.prepare(`UPDATE user_decks SET title = COALESCE(?, title), description = COALESCE(?, description),
    primer_markdown = COALESCE(?, primer_markdown), tags_json = COALESCE(?, tags_json), maybeboard_json = COALESCE(?, maybeboard_json),
    published_title = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_title) ELSE published_title END,
    published_description = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_description) ELSE published_description END,
    published_primer_markdown = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_primer_markdown) ELSE published_primer_markdown END,
    published_tags_json = CASE WHEN visibility <> 'private' THEN COALESCE(?, published_tags_json) ELSE published_tags_json END,
    updated_at = ? WHERE id = ? AND owner_user_id = ?`)
    .bind(title, description, primerMarkdown, tagsJson,
      input.maybeboard === undefined ? null : JSON.stringify(canonicalMaybeboard(input.maybeboard)),
      title, description, primerMarkdown, tagsJson,
      now, deckId, user.id).run();
  if (result.meta.changes && title) {
    await env.ACCOUNT_DB.prepare("UPDATE saved_decks SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(title, now, deckId, user.id).run();
  }
  return Boolean(result.meta.changes);
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

export async function getDeck(env: Env, user: AuthUser, deckId: string): Promise<SavedDeckDetail | null> {
  const deck = await env.ACCOUNT_DB.prepare(`SELECT ud.*, sd.identity_hash
    FROM user_decks ud JOIN saved_decks sd ON sd.id = ud.id
    WHERE ud.id = ? AND ud.owner_user_id = ?`).bind(deckId, user.id).first<Record<string, string | null>>();
  if (!deck) return null;
  const sources = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_deck_sources WHERE saved_deck_id = ? ORDER BY imported_at DESC")
    .bind(deckId).all<Record<string, string | null>>();
  const versionRows = await env.ACCOUNT_DB.prepare(`SELECT dv.*, cb.decklist_json, cb.format, cb.champion_name
    FROM deck_versions dv JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE dv.deck_id = ? ORDER BY dv.version_number DESC`).bind(deckId).all<Record<string, string | null>>();
  const versions: SavedDeckVersion[] = versionRows.results.map((row) => ({
    id: row.id!, versionNumber: Number(row.version_number), decklist: JSON.parse(row.decklist_json!) as OmnidexDecklist,
    format: row.format as DeckFormat, championName: row.champion_name,
    changeNote: row.change_note!, changeSummary: JSON.parse(row.change_summary_json!), createdAt: row.created_at!,
  }));
  const current = versions.find((version) => version.id === deck.current_version_id) ?? versions[0];
  if (!current) return null;
  return {
    id: deck.id!, identityHash: deck.identity_hash!, title: deck.title!, description: deck.description!, primerMarkdown: deck.primer_markdown ?? "",
    tags: JSON.parse(deck.tags_json ?? "[]") as string[],
    visibility: deck.visibility as SavedDeckDetail["visibility"], publicSlug: deck.public_slug,
    currentVersionId: current.id, publishedVersionId: deck.published_version_id,
    maybeboard: JSON.parse(deck.maybeboard_json ?? "[]") as OmnidexDecklistCardLine[],
    format: deck.format as DeckFormat, championName: deck.champion_name, decklist: current.decklist,
    versions, createdAt: deck.created_at!, updatedAt: deck.updated_at!,
    sources: sources.results.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
      externalDeckId: source.external_deck_id!, sourceUrl: source.source_url, label: source.label!, metadata: JSON.parse(source.metadata_json!),
      sideboard: JSON.parse(source.sideboard_json!), importedAt: source.imported_at! })),
  };
}

export async function createDeckVersion(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<{ id: string; versionNumber: number }> {
  const input = parseDeckContent(value, "Invalid deck version");
  if (input.changeNote != null && (typeof input.changeNote !== "string" || input.changeNote.length > 240)) throw badRequest("Change note is too long");
  assertAllowedText(input.changeNote, "Change note");
  const owned = await env.ACCOUNT_DB.prepare("SELECT id, current_version_id, visibility FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ id: string; current_version_id: string; visibility: "private" | "unlisted" | "public" }>();
  if (!owned) throw new ApiError("Deck not found", 404, "deck_not_found");
  const { canonical, coreHash, fullHash } = await prepareDeckBuild(input);
  const current = await env.ACCOUNT_DB.prepare(`SELECT cb.full_identity_hash FROM deck_versions dv
    JOIN canonical_builds cb ON cb.id = dv.canonical_build_id WHERE dv.id = ? AND dv.deck_id = ?`)
    .bind(owned.current_version_id, deckId).first<{ full_identity_hash: string }>();
  if (current?.full_identity_hash === fullHash) throw badRequest("This decklist is already the current version", "duplicate_version");
  const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count, MAX(version_number) AS latest FROM deck_versions WHERE deck_id = ?")
    .bind(deckId).first<{ count: number; latest: number }>();
  if ((count?.count ?? 0) >= MAX_VERSIONS_PER_DECK) throw badRequest(`Version limit of ${MAX_VERSIONS_PER_DECK} reached`, "deck_version_limit_reached");
  await env.ACCOUNT_DB.prepare(`INSERT INTO canonical_builds (id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(full_identity_hash) DO NOTHING`)
    .bind(fullHash, coreHash, fullHash, input.format, input.championName ?? null, JSON.stringify(canonical), new Date().toISOString()).run();
  const build = await env.ACCOUNT_DB.prepare("SELECT id FROM canonical_builds WHERE full_identity_hash = ?").bind(fullHash).first<{ id: string }>();
  if (!build) throw new Error("Canonical build was not created");
  const duplicateOwned = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE user_id = ? AND identity_hash = ? AND id <> ?")
    .bind(user.id, coreHash, deckId).first<{ id: string }>();
  if (duplicateOwned) throw badRequest("This build already exists in your decks", "owned_duplicate_deck");
  const versionId = crypto.randomUUID();
  const versionNumber = (count?.latest ?? 0) + 1;
  const now = new Date().toISOString();
  // Decks that are already public/unlisted have no separate "publish" gate to hide edits behind
  // (see ensureVersionedDeck) — advance the published snapshot to this new version too, so the
  // shared link always shows the latest decklist instead of freezing at whatever was current the
  // last time someone hit Publish.
  const versionUpdate = owned.visibility === "private"
    ? env.ACCOUNT_DB.prepare("UPDATE user_decks SET current_version_id = ?, format = ?, champion_name = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?")
        .bind(versionId, input.format, input.championName ?? null, now, deckId, user.id)
    : env.ACCOUNT_DB.prepare(`UPDATE user_decks SET current_version_id = ?, published_version_id = ?, published_at = ?,
        format = ?, champion_name = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?`)
        .bind(versionId, versionId, now, input.format, input.championName ?? null, now, deckId, user.id);
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare(`INSERT INTO deck_versions (id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at)
      VALUES (?, ?, ?, ?, ?, '{}', ?)`).bind(versionId, deckId, versionNumber, build.id, typeof input.changeNote === "string" ? input.changeNote.trim() : "", now),
    versionUpdate,
    env.ACCOUNT_DB.prepare("UPDATE saved_decks SET identity_hash = ?, format = ?, champion_name = ?, decklist_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(coreHash, input.format, input.championName ?? null, JSON.stringify({ ...canonical, sideboard: [] }), now, deckId, user.id),
  ]);
  return { id: versionId, versionNumber };
}

/**
 * Updates the deck's current decklist content in place — same validation as `createDeckVersion`,
 * but rewrites the existing current version's `canonical_build_id` pointer instead of inserting a
 * new `deck_versions` row, so routine edits don't stack version history the user never asked for.
 * Never mutates an existing `canonical_builds` row (that table is content-addressed and can be
 * shared across decks/versions by hash) — a changed decklist always gets its own build row via the
 * same `ON CONFLICT(full_identity_hash) DO NOTHING` insert `createDeckVersion` uses, only the
 * *pointer* to it moves. `deck_versions.version_number`/`created_at` are left untouched, so
 * `getDeck`'s `previousDecklist`-style diff (the version immediately before the current one)
 * keeps comparing against the last version the user explicitly chose to save, not this edit.
 */
export async function updateDeckDecklist(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<{ id: string; versionNumber: number }> {
  const input = parseDeckContent(value, "Invalid decklist update");
  const owned = await env.ACCOUNT_DB.prepare("SELECT id, current_version_id FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ id: string; current_version_id: string | null }>();
  if (!owned) throw new ApiError("Deck not found", 404, "deck_not_found");
  if (!owned.current_version_id) throw badRequest("Deck has no version to update");
  const currentVersion = await env.ACCOUNT_DB.prepare("SELECT version_number FROM deck_versions WHERE id = ? AND deck_id = ?")
    .bind(owned.current_version_id, deckId).first<{ version_number: number }>();
  if (!currentVersion) throw new Error("Current version record is missing");
  const { canonical, coreHash, fullHash, championName } = await prepareDeckBuild(input);
  const duplicateOwned = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE user_id = ? AND identity_hash = ? AND id <> ?")
    .bind(user.id, coreHash, deckId).first<{ id: string }>();
  if (duplicateOwned) throw badRequest("This build already exists in your decks", "owned_duplicate_deck");
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare(`INSERT INTO canonical_builds (id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(full_identity_hash) DO NOTHING`)
    .bind(fullHash, coreHash, fullHash, input.format, championName, JSON.stringify(canonical), now).run();
  const build = await env.ACCOUNT_DB.prepare("SELECT id FROM canonical_builds WHERE full_identity_hash = ?").bind(fullHash).first<{ id: string }>();
  if (!build) throw new Error("Canonical build was not created");
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("UPDATE deck_versions SET canonical_build_id = ? WHERE id = ? AND deck_id = ?")
      .bind(build.id, owned.current_version_id, deckId),
    env.ACCOUNT_DB.prepare("UPDATE user_decks SET format = ?, champion_name = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?")
      .bind(input.format, championName, now, deckId, user.id),
    env.ACCOUNT_DB.prepare("UPDATE saved_decks SET identity_hash = ?, format = ?, champion_name = ?, decklist_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(coreHash, input.format, championName, JSON.stringify({ ...canonical, sideboard: [] }), now, deckId, user.id),
  ]);
  return { id: owned.current_version_id, versionNumber: currentVersion.version_number };
}

export async function restoreDeckVersion(env: Env, user: AuthUser, deckId: string, versionId: string): Promise<{ id: string; versionNumber: number }> {
  const source = await env.ACCOUNT_DB.prepare(`SELECT cb.decklist_json, cb.format, cb.champion_name
    FROM deck_versions dv JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    JOIN user_decks ud ON ud.id = dv.deck_id
    WHERE dv.id = ? AND dv.deck_id = ? AND ud.owner_user_id = ?`)
    .bind(versionId, deckId, user.id).first<{ decklist_json: string; format: DeckFormat; champion_name: string | null }>();
  if (!source) throw new ApiError("Deck version not found", 404, "deck_version_not_found");
  return createDeckVersion(env, user, deckId, { decklist: JSON.parse(source.decklist_json), format: source.format,
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
