import {
  canonicalizeSavedDecklist,
  savedDeckIdentityInput,
  type DeckFormat,
  type DeckImportCandidate,
  type DeckImportPreview,
  type OmnidexDecklist,
  type OmnidexDecklistEntry,
  type PublicDeck,
  type SavedDeck,
  type SavedDeckDetail,
  type SavedDeckVersion,
  type ShoutAtYourDecksDeck,
  type ShoutAtYourDecksDeckSummary,
} from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { validUserFacingName } from "./content-policy";
import { ApiError, badRequest } from "./errors";

interface SaveInput {
  decklist: OmnidexDecklist;
  title: string;
  format?: DeckFormat;
  championName?: string | null;
  source: {
    provider: "manual" | "omnidex" | "shoutatyourdecks";
    externalDeckId: string;
    sourceUrl?: string | null;
    label: string;
    metadata?: Record<string, unknown>;
  };
}

const MAX_DECKS_PER_USER = 250;
const MAX_LINES_PER_DECK = 250;
const MAX_SOURCES_PER_DECK = 50;
const MAX_IMPORT_DECKS = 50;
const MAX_VERSIONS_PER_DECK = 200;
const MAX_IDENTIFIER_LENGTH = 240;
const MAX_SOURCE_URL_LENGTH = 1_000;
const MAX_METADATA_BYTES = 16_384;
const MAX_PRIMER_LENGTH = 50_000;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;
const ASSET_FETCH_TIMEOUT_MS = 10_000;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const SAFE_ARCHIVE_ID = /^[A-Za-z0-9:_-]{1,240}$/;

export function normalizeDeckTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_TAGS) throw badRequest(`Decks can have up to ${MAX_TAGS} tags`);
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") throw badRequest("Invalid deck tag");
    const tag = raw.trim().replace(/\s+/g, " ");
    if (tag.length < 2 || tag.length > MAX_TAG_LENGTH || /[\p{Cc}\p{Cf}]/u.test(tag)) throw badRequest(`Tags must be 2–${MAX_TAG_LENGTH} characters`);
    if (!validUserFacingName(tag)) throw badRequest("Deck tag contains blocked language", "blocked_language");
    const key = tag.toLocaleLowerCase("en-US");
    if (!seen.has(key)) { seen.add(key); tags.push(tag); }
  }
  return tags;
}

async function identityHash(decklist: OmnidexDecklist): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(savedDeckIdentityInput(decklist)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fullIdentityHash(decklist: OmnidexDecklist, format: DeckFormat, championName: string | null): Promise<string> {
  const canonical = canonicalizeSavedDecklist(decklist);
  return sha256(JSON.stringify({
    format,
    championName: championName?.trim().toLocaleLowerCase("en-US") ?? null,
    decklist: canonical,
  }));
}

async function ensureVersionedDeck(env: Env, user: AuthUser, deckId: string, input: SaveInput, coreHash: string, now: string): Promise<void> {
  const existing = await env.ACCOUNT_DB.prepare("SELECT id FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ id: string }>();
  if (existing) return;
  const canonical = canonicalizeSavedDecklist(input.decklist);
  const format = input.format ?? "UNKNOWN";
  const fullHash = await fullIdentityHash(canonical, format, input.championName ?? null);
  const buildId = fullHash;
  const versionId = crypto.randomUUID();
  await env.ACCOUNT_DB.prepare(`INSERT INTO canonical_builds (id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(full_identity_hash) DO NOTHING`)
    .bind(buildId, coreHash, fullHash, format, input.championName ?? null, JSON.stringify(canonical), now).run();
  const build = await env.ACCOUNT_DB.prepare("SELECT id FROM canonical_builds WHERE full_identity_hash = ?")
    .bind(fullHash).first<{ id: string }>();
  if (!build) throw new Error("Canonical build was not created");
  await env.ACCOUNT_DB.prepare(`INSERT INTO user_decks
    (id, owner_user_id, title, description, visibility, format, champion_name, created_at, updated_at)
    VALUES (?, ?, ?, '', 'private', ?, ?, ?, ?)`)
    .bind(deckId, user.id, input.title.trim(), format, input.championName ?? null, now, now).run();
  await env.ACCOUNT_DB.prepare(`INSERT INTO deck_versions
    (id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at)
    VALUES (?, ?, 1, ?, 'Initial version', '{}', ?)`)
    .bind(versionId, deckId, build.id, now).run();
  await env.ACCOUNT_DB.prepare("UPDATE user_decks SET current_version_id = ? WHERE id = ? AND owner_user_id = ?")
    .bind(versionId, deckId, user.id).run();
}

function validDecklist(value: unknown): value is OmnidexDecklist {
  if (!value || typeof value !== "object") return false;
  const deck = value as Record<string, unknown>;
  const sections = ["main", "material", "sideboard"];
  if (!sections.every((section) => Array.isArray(deck[section]))) return false;
  if (sections.reduce((total, section) => total + (deck[section] as unknown[]).length, 0) > MAX_LINES_PER_DECK) return false;
  return sections.every((section) => (deck[section] as unknown[]).every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as Record<string, unknown>;
    return typeof item.card === "string" && item.card.length <= 200 && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 100;
  }));
}

export function parseSaveInput(value: unknown): SaveInput {
  if (!value || typeof value !== "object") throw badRequest("Invalid saved deck");
  const input = value as Partial<SaveInput>;
  if (!validDecklist(input.decklist) || typeof input.title !== "string" || !input.title.trim() || input.title.length > 160) throw badRequest("Invalid saved deck");
  if (!validUserFacingName(input.title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  if (!input.source || input.source.provider !== "manual" || typeof input.source.externalDeckId !== "string" || !input.source.externalDeckId || input.source.externalDeckId.length > MAX_IDENTIFIER_LENGTH || typeof input.source.label !== "string" || !input.source.label || input.source.label.length > 240) throw badRequest("Invalid deck source");
  if (input.championName != null && (typeof input.championName !== "string" || input.championName.length > 200)) throw badRequest("Invalid champion name");
  if (input.source.sourceUrl != null && (typeof input.source.sourceUrl !== "string" || input.source.sourceUrl.length > MAX_SOURCE_URL_LENGTH)) throw badRequest("Invalid source URL");
  if (JSON.stringify(input.source.metadata ?? {}).length > MAX_METADATA_BYTES) throw badRequest("Deck source metadata is too large");
  return input as SaveInput;
}

export async function saveDeck(env: Env, user: AuthUser, input: SaveInput): Promise<{ id: string; created: boolean }> {
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
  await env.ACCOUNT_DB.prepare(`INSERT INTO saved_decks (id, user_id, identity_hash, title, format, champion_name, decklist_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, identity_hash) DO UPDATE SET updated_at = excluded.updated_at`)
    .bind(deckId, user.id, hash, input.title.trim(), input.format ?? "UNKNOWN", input.championName ?? null, JSON.stringify({ ...canonical, sideboard: [] }), now, now).run();
  const existingSource = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_deck_sources WHERE saved_deck_id = ? AND provider = ? AND external_deck_id = ?")
    .bind(deckId, input.source.provider, input.source.externalDeckId).first<{ id: string }>();
  if (!existingSource) {
    const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM saved_deck_sources WHERE saved_deck_id = ?").bind(deckId).first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_SOURCES_PER_DECK) throw badRequest(`Deck source limit of ${MAX_SOURCES_PER_DECK} reached`, "deck_source_limit_reached");
  }
  await env.ACCOUNT_DB.prepare(`INSERT INTO saved_deck_sources (id, saved_deck_id, provider, external_deck_id, source_url, label, metadata_json, sideboard_json, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(saved_deck_id, provider, external_deck_id) DO UPDATE SET source_url = excluded.source_url,
      label = excluded.label, metadata_json = excluded.metadata_json, sideboard_json = excluded.sideboard_json, imported_at = excluded.imported_at`)
    .bind(crypto.randomUUID(), deckId, input.source.provider, input.source.externalDeckId, input.source.sourceUrl ?? null,
      input.source.label.slice(0, 240), JSON.stringify(input.source.metadata ?? {}), JSON.stringify(canonical.sideboard), now).run();
  await ensureVersionedDeck(env, user, deckId, input, hash, now);
  return { id: deckId, created: !existing };
}

export async function listDecks(env: Env, user: AuthUser): Promise<SavedDeck[]> {
  const decks = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_decks WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, string | null>>();
  const output: SavedDeck[] = [];
  for (const row of decks.results) {
    const sources = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_deck_sources WHERE saved_deck_id = ? ORDER BY imported_at DESC").bind(row.id).all<Record<string, string | null>>();
    const base = JSON.parse(row.decklist_json!) as OmnidexDecklist;
    const newestSideboard = sources.results[0]?.sideboard_json ? JSON.parse(sources.results[0].sideboard_json) : [];
    output.push({
      id: row.id!, identityHash: row.identity_hash!, title: row.title!, format: row.format as DeckFormat,
      championName: row.champion_name, decklist: { ...base, sideboard: newestSideboard }, createdAt: row.created_at!, updatedAt: row.updated_at!,
      sources: sources.results.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
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
    await env.ACCOUNT_DB.prepare("UPDATE user_decks SET title = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?")
      .bind(title, new Date().toISOString(), deckId, user.id).run();
  }
  return Boolean(result.meta.changes);
}

export async function updateDeckMetadata(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<boolean> {
  if (!value || typeof value !== "object") throw badRequest("Invalid deck metadata");
  const input = value as { title?: unknown; description?: unknown; primerMarkdown?: unknown; tags?: unknown };
  if (input.title != null && (typeof input.title !== "string" || !input.title.trim() || input.title.length > 160)) throw badRequest("A valid title is required");
  if (typeof input.title === "string" && !validUserFacingName(input.title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  if (input.description != null && (typeof input.description !== "string" || input.description.length > 2_000)) throw badRequest("Description is too long");
  if (input.primerMarkdown != null && (typeof input.primerMarkdown !== "string" || input.primerMarkdown.length > MAX_PRIMER_LENGTH)) throw badRequest("Primer is too long");
  const tags = input.tags === undefined ? null : normalizeDeckTags(input.tags);
  if (input.title === undefined && input.description === undefined && input.primerMarkdown === undefined && tags === null) throw badRequest("No deck metadata was provided");
  const now = new Date().toISOString();
  const result = await env.ACCOUNT_DB.prepare(`UPDATE user_decks SET title = COALESCE(?, title), description = COALESCE(?, description),
    primer_markdown = COALESCE(?, primer_markdown), tags_json = COALESCE(?, tags_json), updated_at = ? WHERE id = ? AND owner_user_id = ?`)
    .bind(typeof input.title === "string" ? input.title.trim() : null, typeof input.description === "string" ? input.description.trim() : null,
      typeof input.primerMarkdown === "string" ? input.primerMarkdown.trim() : null, tags ? JSON.stringify(tags) : null, now, deckId, user.id).run();
  if (result.meta.changes && typeof input.title === "string") {
    await env.ACCOUNT_DB.prepare("UPDATE saved_decks SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(input.title.trim(), now, deckId, user.id).run();
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
  const row = await env.ACCOUNT_DB.prepare(`SELECT ud.public_slug, ud.published_title, ud.published_description, ud.published_primer_markdown,
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
    format: deck.format as DeckFormat, championName: deck.champion_name, decklist: current.decklist,
    versions, createdAt: deck.created_at!, updatedAt: deck.updated_at!,
    sources: sources.results.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
      externalDeckId: source.external_deck_id!, sourceUrl: source.source_url, label: source.label!, metadata: JSON.parse(source.metadata_json!),
      sideboard: JSON.parse(source.sideboard_json!), importedAt: source.imported_at! })),
  };
}

export async function createDeckVersion(env: Env, user: AuthUser, deckId: string, value: unknown): Promise<{ id: string; versionNumber: number }> {
  if (!value || typeof value !== "object") throw badRequest("Invalid deck version");
  const input = value as { decklist?: unknown; format?: unknown; championName?: unknown; changeNote?: unknown };
  if (!validDecklist(input.decklist)) throw badRequest("Invalid decklist");
  if (input.format !== "STANDARD" && input.format !== "PANTHEON" && input.format !== "UNKNOWN") throw badRequest("Invalid deck format");
  if (input.championName != null && (typeof input.championName !== "string" || input.championName.length > 200)) throw badRequest("Invalid champion name");
  if (input.changeNote != null && (typeof input.changeNote !== "string" || input.changeNote.length > 240)) throw badRequest("Change note is too long");
  const owned = await env.ACCOUNT_DB.prepare("SELECT id, current_version_id FROM user_decks WHERE id = ? AND owner_user_id = ?")
    .bind(deckId, user.id).first<{ id: string; current_version_id: string }>();
  if (!owned) throw new ApiError("Deck not found", 404, "deck_not_found");
  const canonical = canonicalizeSavedDecklist(input.decklist);
  if (canonical.main.length + canonical.material.length === 0) throw badRequest("A deck needs main or material cards");
  const coreHash = await identityHash(canonical);
  const fullHash = await fullIdentityHash(canonical, input.format, typeof input.championName === "string" ? input.championName : null);
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
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare(`INSERT INTO deck_versions (id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at)
      VALUES (?, ?, ?, ?, ?, '{}', ?)`).bind(versionId, deckId, versionNumber, build.id, typeof input.changeNote === "string" ? input.changeNote.trim() : "", now),
    env.ACCOUNT_DB.prepare("UPDATE user_decks SET current_version_id = ?, format = ?, champion_name = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?")
      .bind(versionId, input.format, input.championName ?? null, now, deckId, user.id),
    env.ACCOUNT_DB.prepare("UPDATE saved_decks SET identity_hash = ?, format = ?, champion_name = ?, decklist_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(coreHash, input.format, input.championName ?? null, JSON.stringify({ ...canonical, sideboard: [] }), now, deckId, user.id),
  ]);
  return { id: versionId, versionNumber };
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

export async function assetJson<T>(env: Env, path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(path, env.ASSET_BASE_URL), { signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`Published data is unavailable (${response.status})`);
    const declaredSize = Number(response.headers.get("Content-Length") ?? 0);
    if (declaredSize > MAX_ASSET_BYTES) throw new Error("Published data response is too large");
    if (!response.body) throw new Error("Published data response is empty");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ASSET_BYTES) {
        await reader.cancel();
        throw new Error("Published data response is too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } finally {
    clearTimeout(timeout);
  }
}

interface ImportEntry { deckId: string; eventId: number; eventDate: string; player: number; championName: string | null; placement: number | null; }
interface ImportEvent { id: number; name: string; format: string; url: string; }

export async function previewImport(env: Env, provider: string, rawIdentifier: string): Promise<DeckImportPreview> {
  const identifier = rawIdentifier.trim();
  if (!identifier) throw badRequest("Enter an import identifier");
  if (identifier.length > MAX_IDENTIFIER_LENGTH) throw badRequest("Import identifier is too long");
  if (provider === "omnidex") {
    if (!/^\d+$/.test(identifier)) throw badRequest("Omnidex player ID must be numeric");
    const playerId = Number(identifier);
    const [players, popularity, events] = await Promise.all([
      assetJson<{ players: { id: number; username: string }[] }>(env, "/data/omnidex/players.json"),
      assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json"),
      assetJson<{ events: ImportEvent[] }>(env, "/data/omnidex/index.json"),
    ]);
    const player = players.players.find((item) => item.id === playerId);
    if (!player) throw badRequest("Omnidex player was not found in the published archive", "import_profile_not_found");
    const eventsById = new Map(events.events.map((event) => [event.id, event]));
    const candidates: DeckImportCandidate[] = popularity.entries.filter((item) => item.player === playerId).map((item) => {
      const event = eventsById.get(item.eventId);
      return { provider: "omnidex", externalDeckId: item.deckId, title: `${item.championName ?? "Tournament deck"} — ${event?.name ?? `Event ${item.eventId}`}`,
        championName: item.championName, format: event?.format.toUpperCase().includes("PANTHEON") ? "PANTHEON" : "STANDARD",
        label: `${event?.name ?? `Event ${item.eventId}`} · ${item.eventDate}`, sourceUrl: event?.url ?? `/events/${item.eventId}`, available: true };
    });
    return { provider: "omnidex", identifier, displayName: player.username, candidates };
  }
  if (provider === "shoutatyourdecks") {
    const index = await assetJson<{ decks: ShoutAtYourDecksDeckSummary[] }>(env, "/data/shoutatyourdecks/index.json");
    const normalized = identifier.toLocaleLowerCase("en-US");
    const matches = index.decks.filter((deck) => deck.author.trim().toLocaleLowerCase("en-US") === normalized);
    return { provider: "shoutatyourdecks", identifier, displayName: matches[0]?.author ?? identifier, candidates: matches.map((deck) => ({
      provider: "shoutatyourdecks", externalDeckId: deck.id, title: deck.title, championName: deck.champion,
      format: deck.format ?? "UNKNOWN", label: deck.title, sourceUrl: deck.url, available: true,
    })) };
  }
  throw badRequest("Unknown import provider");
}

export async function performImport(env: Env, user: AuthUser, provider: string, identifier: string): Promise<{ created: number; linked: number }> {
  const preview = await previewImport(env, provider, identifier);
  if (preview.candidates.length > MAX_IMPORT_DECKS) throw badRequest(`Import is limited to ${MAX_IMPORT_DECKS} decks at a time`, "import_limit_reached");
  let created = 0;
  let linked = 0;
  if (provider === "omnidex") {
    const popularity = await assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json");
    for (const candidate of preview.candidates) {
      if (!SAFE_ARCHIVE_ID.test(candidate.externalDeckId)) continue;
      const sighting = popularity.entries.find((item) => item.deckId === candidate.externalDeckId);
      if (!sighting) continue;
      const bundle = await assetJson<{ decklists: OmnidexDecklistEntry[] | { error: string } }>(env, `/data/omnidex/events/${sighting.eventId}.json`);
      if (!Array.isArray(bundle.decklists)) continue;
      const entry = bundle.decklists.find((item) => item.player === sighting.player);
      if (!entry) continue;
      const result = await saveDeck(env, user, { decklist: entry.decklist, title: candidate.title, format: candidate.format,
        championName: candidate.championName, source: { provider: "omnidex", externalDeckId: candidate.externalDeckId,
          sourceUrl: candidate.sourceUrl, label: candidate.label, metadata: { eventId: sighting.eventId, eventDate: sighting.eventDate, placement: sighting.placement } } });
      result.created ? created++ : linked++;
    }
  } else {
    for (const candidate of preview.candidates) {
      if (!SAFE_ARCHIVE_ID.test(candidate.externalDeckId)) continue;
      try {
        const deck = await assetJson<ShoutAtYourDecksDeck>(env, `/data/shoutatyourdecks/decks/${candidate.externalDeckId}.json`);
        const decklist: OmnidexDecklist = { main: deck.mainDeck.map((line) => ({ card: line.name, quantity: line.quantity })),
          material: [...(deck.pantheonDeck ?? []), ...deck.materialDeck].map((line) => ({ card: line.name, quantity: line.quantity })),
          sideboard: deck.sideDeck.map((line) => ({ card: line.name, quantity: line.quantity })) };
        const result = await saveDeck(env, user, { decklist, title: deck.title, format: deck.format ?? "UNKNOWN", championName: deck.champion,
          source: { provider: "shoutatyourdecks", externalDeckId: deck.id, sourceUrl: deck.url, label: deck.title, metadata: { author: deck.author } } });
        result.created ? created++ : linked++;
      } catch { /* Archive summaries can exist before their browser-fetched full list. */ }
    }
  }
  const now = new Date().toISOString();
  const normalized = identifier.trim().toLocaleLowerCase("en-US");
  await env.ACCOUNT_DB.prepare(`INSERT INTO external_profiles (id, user_id, provider, external_identifier, normalized_identifier, display_name, last_imported_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider, normalized_identifier) DO UPDATE SET display_name = excluded.display_name, last_imported_at = excluded.last_imported_at`)
    .bind(crypto.randomUUID(), user.id, provider, identifier.trim(), normalized, preview.displayName, now, now).run();
  return { created, linked };
}
