import type { BookmarkedDeck, DeckSocialState, OmnidexDecklist } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError } from "./errors";
import { saveDeck } from "./decks";

const MAX_LIKES_PER_USER = 5_000;
const MAX_BOOKMARKS_PER_USER = 500;

async function publishedDeck(env: Env, slug: string) {
  if (!/^[a-f0-9]{32}$/.test(slug)) return null;
  return env.ACCOUNT_DB.prepare(`SELECT ud.id, ud.title, ud.description, ud.visibility, ud.public_slug, ud.published_at,
    ud.updated_at, ud.published_version_id, users.display_name, users.profile_slug, dv.version_number, cb.format, cb.champion_name,
    cb.decklist_json, (SELECT COUNT(*) FROM deck_likes dl WHERE dl.deck_id = ud.id) AS like_count
    FROM user_decks ud JOIN users ON users.id = ud.owner_user_id
    JOIN deck_versions dv ON dv.id = ud.published_version_id AND dv.deck_id = ud.id
    JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE ud.public_slug = ? AND ud.visibility IN ('public', 'unlisted') AND ud.moderation_status = 'active'`).bind(slug).first<Record<string, string | number | null>>();
}

export async function getDeckSocialState(env: Env, user: AuthUser, slug: string): Promise<DeckSocialState> {
  const deck = await publishedDeck(env, slug);
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  const like = await env.ACCOUNT_DB.prepare("SELECT 1 AS found FROM deck_likes WHERE user_id = ? AND deck_id = ?").bind(user.id, deck.id).first();
  const bookmark = await env.ACCOUNT_DB.prepare(`SELECT dv.version_number FROM deck_bookmarks db
    JOIN deck_versions dv ON dv.id = db.version_id WHERE db.user_id = ? AND db.deck_id = ?`).bind(user.id, deck.id).first<{ version_number: number }>();
  return { liked: Boolean(like), bookmarked: Boolean(bookmark), bookmarkedVersionNumber: bookmark?.version_number ?? null };
}

export async function setDeckLike(env: Env, user: AuthUser, slug: string, liked: boolean): Promise<{ liked: boolean; likeCount: number }> {
  const deck = await publishedDeck(env, slug);
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  if (liked) {
    const existing = await env.ACCOUNT_DB.prepare("SELECT 1 AS found FROM deck_likes WHERE user_id = ? AND deck_id = ?").bind(user.id, deck.id).first();
    if (!existing) {
      const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM deck_likes WHERE user_id = ?").bind(user.id).first<{ count: number }>();
      if ((count?.count ?? 0) >= MAX_LIKES_PER_USER) throw new ApiError(`Like limit of ${MAX_LIKES_PER_USER} reached`, 400, "like_limit_reached");
    }
    await env.ACCOUNT_DB.prepare("INSERT INTO deck_likes (user_id, deck_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").bind(user.id, deck.id, new Date().toISOString()).run();
  }
  else await env.ACCOUNT_DB.prepare("DELETE FROM deck_likes WHERE user_id = ? AND deck_id = ?").bind(user.id, deck.id).run();
  const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM deck_likes WHERE deck_id = ?").bind(deck.id).first<{ count: number }>();
  return { liked, likeCount: count?.count ?? 0 };
}

export async function setDeckBookmark(env: Env, user: AuthUser, slug: string, bookmarked: boolean): Promise<{ bookmarked: boolean; versionNumber: number | null }> {
  const deck = await publishedDeck(env, slug);
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  if (bookmarked) {
    const existing = await env.ACCOUNT_DB.prepare("SELECT 1 AS found FROM deck_bookmarks WHERE user_id = ? AND deck_id = ?").bind(user.id, deck.id).first();
    if (!existing) {
      const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM deck_bookmarks WHERE user_id = ?").bind(user.id).first<{ count: number }>();
      if ((count?.count ?? 0) >= MAX_BOOKMARKS_PER_USER) throw new ApiError(`Saved deck limit of ${MAX_BOOKMARKS_PER_USER} reached`, 400, "bookmark_limit_reached");
    }
    await env.ACCOUNT_DB.prepare(`INSERT INTO deck_bookmarks (user_id, deck_id, version_id, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, deck_id) DO UPDATE SET version_id = excluded.version_id, created_at = excluded.created_at`)
    .bind(user.id, deck.id, deck.published_version_id, new Date().toISOString()).run();
  } else await env.ACCOUNT_DB.prepare("DELETE FROM deck_bookmarks WHERE user_id = ? AND deck_id = ?").bind(user.id, deck.id).run();
  return { bookmarked, versionNumber: bookmarked ? Number(deck.version_number) : null };
}

export async function copyPublishedDeck(env: Env, user: AuthUser, slug: string): Promise<{ id: string; created: boolean }> {
  const deck = await publishedDeck(env, slug);
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  const result = await saveDeck(env, user, {
    title: `Copy of ${deck.title}`,
    format: deck.format as "STANDARD" | "PANTHEON" | "UNKNOWN",
    championName: deck.champion_name as string | null,
    decklist: JSON.parse(String(deck.decklist_json)) as OmnidexDecklist,
    source: { provider: "manual", externalDeckId: `copy:${deck.id}:${deck.published_version_id}`, label: `Copied from ${deck.title}` },
  });
  if (result.created) await env.ACCOUNT_DB.prepare("UPDATE user_decks SET copied_from_deck_id = ?, copied_from_version_id = ? WHERE id = ? AND owner_user_id = ?")
    .bind(deck.id, deck.published_version_id, result.id, user.id).run();
  return result;
}

export async function listBookmarks(env: Env, user: AuthUser): Promise<BookmarkedDeck[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT ud.public_slug, ud.title, ud.description, ud.visibility, ud.published_at, ud.updated_at,
    users.display_name, users.profile_slug, dv.version_number, cb.format, cb.champion_name, cb.decklist_json, db.created_at AS bookmarked_at,
    (SELECT COUNT(*) FROM deck_likes dl WHERE dl.deck_id = ud.id) AS like_count
    FROM deck_bookmarks db JOIN user_decks ud ON ud.id = db.deck_id JOIN users ON users.id = ud.owner_user_id
    JOIN deck_versions dv ON dv.id = db.version_id AND dv.deck_id = ud.id JOIN canonical_builds cb ON cb.id = dv.canonical_build_id
    WHERE db.user_id = ? AND ud.visibility IN ('public', 'unlisted') AND ud.moderation_status = 'active' ORDER BY db.created_at DESC`).bind(user.id).all<Record<string, string | number | null>>();
  return rows.results.map((row) => ({ publicSlug: String(row.public_slug), title: String(row.title), description: String(row.description),
    visibility: row.visibility as "public" | "unlisted", format: row.format as "STANDARD" | "PANTHEON" | "UNKNOWN",
    championName: row.champion_name as string | null, decklist: JSON.parse(String(row.decklist_json)) as OmnidexDecklist,
    versionNumber: Number(row.version_number), publishedAt: String(row.published_at), updatedAt: String(row.updated_at),
    owner: { displayName: String(row.display_name), profileSlug: String(row.profile_slug) }, likeCount: Number(row.like_count), bookmarkedAt: String(row.bookmarked_at) }));
}
