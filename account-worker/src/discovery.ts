import type { DeckFormat, PublicDeckSummary, PublicProfile } from "@gatcg/shared";
import type { Env } from "./auth";
import { badRequest } from "./errors";

const PROFILE_SLUG = /^[a-f0-9]{24}$/;
const MAX_QUERY_LENGTH = 80;
const PAGE_SIZE = 24;

function summary(row: Record<string, string | number | null>): PublicDeckSummary {
  return {
    publicSlug: String(row.public_slug), title: String(row.title), description: String(row.description),
    format: row.format as DeckFormat, championName: row.champion_name ? String(row.champion_name) : null,
    versionNumber: Number(row.version_number), publishedAt: String(row.published_at),
    owner: { displayName: String(row.display_name), profileSlug: String(row.profile_slug) },
    likeCount: Number(row.like_count ?? 0),
  };
}

const SELECT = `SELECT ud.public_slug, ud.title, ud.description, ud.published_at,
  users.display_name, users.profile_slug, dv.version_number, cb.format, cb.champion_name,
  (SELECT COUNT(*) FROM deck_likes dl WHERE dl.deck_id = ud.id) AS like_count
  FROM user_decks ud
  JOIN users ON users.id = ud.owner_user_id
  JOIN deck_versions dv ON dv.id = ud.published_version_id AND dv.deck_id = ud.id
  JOIN canonical_builds cb ON cb.id = dv.canonical_build_id`;

export async function discoverDecks(env: Env, params: URLSearchParams): Promise<{ decks: PublicDeckSummary[]; nextPage: number | null }> {
  const query = (params.get("q") ?? "").trim();
  if (query.length > MAX_QUERY_LENGTH) throw badRequest("Search is too long");
  const format = params.get("format");
  if (format && format !== "STANDARD" && format !== "PANTHEON" && format !== "UNKNOWN") throw badRequest("Invalid deck format");
  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 100) throw badRequest("Invalid page");
  const where = ["ud.visibility = 'public'", "ud.published_version_id IS NOT NULL"];
  const bindings: unknown[] = [];
  if (query) { where.push("(ud.title LIKE ? ESCAPE '\\' OR cb.champion_name LIKE ? ESCAPE '\\' OR users.display_name LIKE ? ESCAPE '\\')"); const escaped = `%${query.replace(/[\\%_]/g, "\\$&")}%`; bindings.push(escaped, escaped, escaped); }
  if (format) { where.push("cb.format = ?"); bindings.push(format); }
  const rows = await env.ACCOUNT_DB.prepare(`${SELECT} WHERE ${where.join(" AND ")}
    ORDER BY like_count DESC, ud.published_at DESC LIMIT ? OFFSET ?`)
    .bind(...bindings, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE).all<Record<string, string | number | null>>();
  return { decks: rows.results.slice(0, PAGE_SIZE).map(summary), nextPage: rows.results.length > PAGE_SIZE ? page + 1 : null };
}

export async function getPublicProfile(env: Env, slug: string): Promise<PublicProfile | null> {
  if (!PROFILE_SLUG.test(slug)) return null;
  const user = await env.ACCOUNT_DB.prepare("SELECT display_name, profile_slug FROM users WHERE profile_slug = ?")
    .bind(slug).first<{ display_name: string; profile_slug: string }>();
  if (!user) return null;
  const rows = await env.ACCOUNT_DB.prepare(`${SELECT} WHERE users.profile_slug = ? AND ud.visibility = 'public'
    AND ud.published_version_id IS NOT NULL ORDER BY ud.published_at DESC LIMIT 100`).bind(slug).all<Record<string, string | number | null>>();
  return { displayName: user.display_name, profileSlug: user.profile_slug, decks: rows.results.map(summary) };
}
