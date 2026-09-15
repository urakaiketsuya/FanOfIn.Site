import type { BookmarkedCombo, ComboDefinition, ComboGoal, ComboVisibility, DeckFormat, PublicCombo, SavedCombo } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const SLUG = /^[a-f0-9]{32}$/;
const GOALS = new Set<ComboGoal>(["level", "lethal", "board", "resources", "cards", "custom"]);
const VISIBILITIES = new Set<ComboVisibility>(["private", "unlisted", "public"]);
const FORMATS = new Set<DeckFormat>(["STANDARD", "PANTHEON", "UNKNOWN"]);

function cleanText(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string") { if (!required && value === undefined) return ""; throw badRequest(`${label} is required`); }
  const clean = value.trim();
  if ((required && !clean) || clean.length > max || /[\u0000-\u001f\u007f]/.test(clean)) throw badRequest(`${label} must be ${required ? `1–${max}` : `at most ${max}`} characters`);
  return clean;
}

function definition(value: unknown): ComboDefinition {
  if (!value || typeof value !== "object") throw badRequest("Combo definition is required");
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.requirements) || raw.requirements.length < 1 || raw.requirements.length > 8) throw badRequest("Combo must contain 1–8 valid requirement groups");
  const requirements = raw.requirements.map((entry) => {
    if (!entry || typeof entry !== "object") throw badRequest("Invalid combo requirement");
    const item = entry as Record<string, unknown>;
    if (!(["cards", "attribute", "keyword"] as unknown[]).includes(item.kind) || !Array.isArray(item.cards) || item.cards.length > 24 || typeof item.value !== "string" || item.value.length > 80 || !Number.isInteger(item.required) || Number(item.required) < 1 || Number(item.required) > 20) throw badRequest("Invalid combo requirement");
    const cards = item.cards.map((card) => cleanText(card, "Card name", 120, true));
    if (item.kind === "cards" && cards.length < 1) throw badRequest("Card requirements need at least one card");
    if (item.kind !== "cards" && !item.value.trim()) throw badRequest("Type and keyword requirements need a value");
    return { kind: item.kind as "cards" | "attribute" | "keyword", cards, value: item.value.trim(), required: Number(item.required) };
  });
  const damage = Number(raw.damage ?? 0);
  const targetTurn = raw.targetTurn === null || raw.targetTurn === undefined ? null : Number(raw.targetTurn);
  if (!Number.isFinite(damage) || damage < 0 || damage > 999 || (targetTurn !== null && (!Number.isInteger(targetTurn) || targetTurn < 1 || targetTurn > 20))) throw badRequest("Invalid combo damage or target turn");
  const goal = GOALS.has(raw.goal as ComboGoal) ? raw.goal as ComboGoal : "custom";
  return { schemaVersion: 1, requirements, damage, goal, targetTurn };
}

async function hash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) throw badRequest("Use no more than 8 tags");
  return [...new Set(value.map((tag) => cleanText(tag, "Tag", 24, true)))];
}

function saved(row: Record<string, unknown>): SavedCombo {
  return { id: String(row.id), publicSlug: row.public_slug ? String(row.public_slug) : null, name: String(row.name), description: String(row.description ?? ""), tags: JSON.parse(String(row.tags_json ?? "[]")) as string[], visibility: row.visibility as ComboVisibility, definition: JSON.parse(String(row.definition_json)) as ComboDefinition, format: row.format as DeckFormat, championName: row.champion_name ? String(row.champion_name) : null, exampleDeckId: row.example_deck_id ? String(row.example_deck_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function published(row: Record<string, unknown>): PublicCombo {
  const combo = saved(row);
  return { publicSlug: combo.publicSlug!, name: combo.name, description: combo.description, tags: combo.tags, visibility: combo.visibility as "public" | "unlisted", definition: combo.definition, format: combo.format, championName: combo.championName, createdAt: combo.createdAt, updatedAt: combo.updatedAt, owner: { displayName: String(row.display_name), profileSlug: String(row.profile_slug) }, saveCount: Number(row.save_count ?? 0), exampleDeckSlug: row.example_deck_slug ? String(row.example_deck_slug) : null };
}

const PUBLIC_COLUMNS = `uc.*, users.display_name, users.profile_slug,
  (SELECT COUNT(*) FROM combo_bookmarks cb WHERE cb.combo_id = uc.id) AS save_count,
  (SELECT public_slug FROM user_decks ud WHERE ud.id = uc.example_deck_id AND ud.visibility IN ('public','unlisted')) AS example_deck_slug`;
const PUBLIC_SELECT = `SELECT ${PUBLIC_COLUMNS} FROM user_combos uc JOIN users ON users.id = uc.owner_user_id`;

export async function listCombos(env: Env, user: AuthUser): Promise<SavedCombo[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT * FROM user_combos WHERE owner_user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, unknown>>();
  return rows.results.map(saved);
}

export async function createCombo(env: Env, user: AuthUser, input: unknown): Promise<{ combo: SavedCombo; created: boolean }> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const parsed = definition(body.definition);
  const definitionHash = await hash(parsed);
  if (body.deduplicate === true) {
    const existing = await env.ACCOUNT_DB.prepare("SELECT * FROM user_combos WHERE owner_user_id = ? AND definition_hash = ?").bind(user.id, definitionHash).first<Record<string, unknown>>();
    if (existing) return { combo: saved(existing), created: false };
  }
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const visibility = VISIBILITIES.has(body.visibility as ComboVisibility) ? body.visibility as ComboVisibility : "private";
  const format = FORMATS.has(body.format as DeckFormat) ? body.format as DeckFormat : "UNKNOWN";
  const exampleDeckId = typeof body.exampleDeckId === "string" ? body.exampleDeckId : null;
  if (exampleDeckId && !await env.ACCOUNT_DB.prepare("SELECT 1 FROM user_decks WHERE id = ? AND owner_user_id = ?").bind(exampleDeckId, user.id).first()) throw badRequest("Example deck was not found");
  const publicSlug = visibility === "private" ? null : crypto.randomUUID().replaceAll("-", "");
  await env.ACCOUNT_DB.prepare(`INSERT INTO user_combos (id, owner_user_id, public_slug, name, description, tags_json, visibility, definition_json, definition_hash, format, champion_name, example_deck_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.id, publicSlug, cleanText(body.name, "Combo name", 80, true), cleanText(body.description, "Description", 1000), JSON.stringify(tags(body.tags)), visibility, JSON.stringify(parsed), definitionHash, format, typeof body.championName === "string" ? cleanText(body.championName, "Champion", 120) || null : null, exampleDeckId, now, now).run();
  return { combo: (await listCombos(env, user)).find((combo) => combo.id === id)!, created: true };
}

export async function updateCombo(env: Env, user: AuthUser, id: string, input: unknown): Promise<SavedCombo | null> {
  const current = await env.ACCOUNT_DB.prepare("SELECT * FROM user_combos WHERE id = ? AND owner_user_id = ?").bind(id, user.id).first<Record<string, unknown>>();
  if (!current) return null;
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const nextDefinition = body.definition === undefined ? JSON.parse(String(current.definition_json)) as ComboDefinition : definition(body.definition);
  const visibility = body.visibility === undefined ? current.visibility as ComboVisibility : body.visibility as ComboVisibility;
  if (!VISIBILITIES.has(visibility)) throw badRequest("Invalid visibility");
  let publicSlug = current.public_slug ? String(current.public_slug) : null;
  if (visibility !== "private" && !publicSlug) publicSlug = crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare(`UPDATE user_combos SET name=?, description=?, tags_json=?, visibility=?, public_slug=?, definition_json=?, definition_hash=?, updated_at=? WHERE id=? AND owner_user_id=?`)
    .bind(body.name === undefined ? current.name : cleanText(body.name, "Combo name", 80, true), body.description === undefined ? current.description : cleanText(body.description, "Description", 1000), body.tags === undefined ? current.tags_json : JSON.stringify(tags(body.tags)), visibility, publicSlug, JSON.stringify(nextDefinition), await hash(nextDefinition), now, id, user.id).run();
  return saved((await env.ACCOUNT_DB.prepare("SELECT * FROM user_combos WHERE id = ?").bind(id).first<Record<string, unknown>>())!);
}

export async function deleteCombo(env: Env, user: AuthUser, id: string): Promise<boolean> {
  return (await env.ACCOUNT_DB.prepare("DELETE FROM user_combos WHERE id = ? AND owner_user_id = ?").bind(id, user.id).run()).meta.changes > 0;
}

export async function getPublicCombo(env: Env, slug: string): Promise<PublicCombo | null> {
  if (!SLUG.test(slug)) return null;
  const row = await env.ACCOUNT_DB.prepare(`${PUBLIC_SELECT} WHERE uc.public_slug = ? AND uc.visibility IN ('public','unlisted')`).bind(slug).first<Record<string, unknown>>();
  return row ? published(row) : null;
}

export async function discoverCombos(env: Env, params: URLSearchParams): Promise<{ combos: PublicCombo[] }> {
  const query = (params.get("q") ?? "").trim();
  if (query.length > 80) throw badRequest("Search is too long");
  const bindings: unknown[] = [];
  let search = "";
  if (query) { const value = `%${query.replace(/[\\%_]/g, "\\$&")}%`; search = " AND (uc.name LIKE ? ESCAPE '\\' OR uc.description LIKE ? ESCAPE '\\' OR uc.tags_json LIKE ? ESCAPE '\\' OR uc.champion_name LIKE ? ESCAPE '\\' OR uc.definition_json LIKE ? ESCAPE '\\')"; bindings.push(value, value, value, value, value); }
  const rows = await env.ACCOUNT_DB.prepare(`${PUBLIC_SELECT} WHERE uc.visibility = 'public' AND users.profile_discoverable = 1${search} ORDER BY save_count DESC, uc.updated_at DESC LIMIT 100`).bind(...bindings).all<Record<string, unknown>>();
  return { combos: rows.results.map(published) };
}

export async function setComboBookmark(env: Env, user: AuthUser, slug: string, bookmarked: boolean): Promise<{ bookmarked: boolean }> {
  const combo = await env.ACCOUNT_DB.prepare("SELECT id FROM user_combos WHERE public_slug = ? AND visibility IN ('public','unlisted')").bind(slug).first<{ id: string }>();
  if (!combo) throw new ApiError("Combo not found", 404, "combo_not_found");
  if (bookmarked) await env.ACCOUNT_DB.prepare("INSERT INTO combo_bookmarks (user_id, combo_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").bind(user.id, combo.id, new Date().toISOString()).run();
  else await env.ACCOUNT_DB.prepare("DELETE FROM combo_bookmarks WHERE user_id = ? AND combo_id = ?").bind(user.id, combo.id).run();
  return { bookmarked };
}

export async function listComboBookmarks(env: Env, user: AuthUser): Promise<BookmarkedCombo[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT ${PUBLIC_COLUMNS}, combo_bookmarks.created_at AS bookmarked_at FROM combo_bookmarks JOIN user_combos uc ON uc.id = combo_bookmarks.combo_id JOIN users ON users.id = uc.owner_user_id WHERE combo_bookmarks.user_id = ? AND uc.visibility IN ('public','unlisted') ORDER BY combo_bookmarks.created_at DESC`).bind(user.id).all<Record<string, unknown>>();
  return rows.results.map((row) => ({ ...published(row), bookmarkedAt: String(row.bookmarked_at) }));
}
