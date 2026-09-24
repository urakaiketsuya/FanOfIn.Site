import type { CommentReportReason, DeckComment, DeckCommentTarget, DeckCommentThread } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const MAX_BODY = 2_000;
const REPORT_REASONS = new Set<CommentReportReason>(["spam", "abuse", "harassment", "other"]);

function cleanBody(value: unknown): string {
  if (typeof value !== "string") throw badRequest("Comment text is required");
  const body = value.trim().replace(/\r\n?/g, "\n");
  if (!body || body.length > MAX_BODY) throw badRequest(`Comments must be 1–${MAX_BODY.toLocaleString()} characters`);
  return body;
}

export function parseCommentTarget(kind: string, id: string): DeckCommentTarget {
  if (kind === "community" && /^[a-f0-9]{32}$/.test(id)) return { kind, id };
  if (kind === "tournament" && /^[a-z0-9]{1,64}$/i.test(id)) return { kind, id: id.toLowerCase() };
  throw badRequest("Invalid deck discussion target");
}

async function communityOwner(env: Env, target: DeckCommentTarget): Promise<string | null> {
  if (target.kind !== "community") return null;
  const deck = await env.ACCOUNT_DB.prepare("SELECT owner_user_id FROM user_decks WHERE public_slug = ? AND visibility IN ('public', 'unlisted') AND moderation_status = 'active'")
    .bind(target.id).first<{ owner_user_id: string }>();
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  return deck.owner_user_id;
}

async function ensureThread(env: Env, target: DeckCommentTarget): Promise<{ ownerUserId: string | null; locked: boolean }> {
  const existing = await env.ACCOUNT_DB.prepare("SELECT owner_user_id, locked FROM deck_comment_threads WHERE target_kind = ? AND target_id = ?")
    .bind(target.kind, target.id).first<{ owner_user_id: string | null; locked: number }>();
  if (existing) return { ownerUserId: existing.owner_user_id, locked: Boolean(existing.locked) };
  const ownerUserId = await communityOwner(env, target);
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare("INSERT OR IGNORE INTO deck_comment_threads (target_kind, target_id, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(target.kind, target.id, ownerUserId, now, now).run();
  return { ownerUserId, locked: false };
}

type CommentRow = { id: string; parent_id: string | null; author_user_id: string; body: string; status: string; created_at: string; updated_at: string; display_name: string; profile_slug: string; avatar_url: string | null };

export async function getComments(env: Env, target: DeckCommentTarget, viewer: AuthUser | null, sort: string): Promise<DeckCommentThread> {
  const resolvedOwner = target.kind === "community" ? await communityOwner(env, target) : null;
  const thread = await env.ACCOUNT_DB.prepare("SELECT owner_user_id, locked FROM deck_comment_threads WHERE target_kind = ? AND target_id = ?")
    .bind(target.kind, target.id).first<{ owner_user_id: string | null; locked: number }>();
  const viewerRole = viewer ? await env.ACCOUNT_DB.prepare("SELECT community_role FROM users WHERE id=?").bind(viewer.id).first<{ community_role: string }>() : null;
  const rows = await env.ACCOUNT_DB.prepare(`SELECT c.id, c.parent_id, c.author_user_id, c.body, c.status, c.created_at, c.updated_at,
      u.display_name, u.profile_slug, u.avatar_url
    FROM deck_comments c JOIN users u ON u.id = c.author_user_id
    WHERE c.target_kind = ? AND c.target_id = ? AND c.status != 'hidden'
      AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_user_id = ? AND b.blocked_user_id = c.author_user_id)
    ORDER BY c.created_at ${sort === "newest" ? "DESC" : "ASC"} LIMIT 300`)
    .bind(target.kind, target.id, viewer?.id ?? "").all<CommentRow>();
  const mapped = new Map<string, DeckComment>();
  for (const row of rows.results) mapped.set(row.id, {
    id: row.id, parentId: row.parent_id, body: row.status === "deleted" ? "" : row.body,
    author: { displayName: row.display_name, profileSlug: row.profile_slug, avatarUrl: row.avatar_url },
    createdAt: row.created_at, updatedAt: row.updated_at, edited: row.updated_at !== row.created_at,
    deleted: row.status === "deleted", mine: viewer?.id === row.author_user_id, replies: [],
  });
  const comments: DeckComment[] = [];
  for (const comment of mapped.values()) {
    const parent = comment.parentId ? mapped.get(comment.parentId) : null;
    if (parent) parent.replies.push(comment); else comments.push(comment);
  }
  return { target, locked: Boolean(thread?.locked), canLock: Boolean(viewer && ((thread?.owner_user_id ?? resolvedOwner) === viewer.id || viewerRole?.community_role === "moderator" || viewerRole?.community_role === "staff")), comments, total: rows.results.length };
}

export async function createComment(env: Env, user: AuthUser, target: DeckCommentTarget, value: unknown): Promise<{ id: string }> {
  if (!value || typeof value !== "object") throw badRequest("Invalid comment");
  const input = value as { body?: unknown; parentId?: unknown };
  const body = cleanBody(input.body);
  const parentId = typeof input.parentId === "string" && input.parentId ? input.parentId : null;
  const thread = await ensureThread(env, target);
  if (thread.locked) throw new ApiError("This discussion is locked", 409, "comments_locked");
  if (parentId) {
    const parent = await env.ACCOUNT_DB.prepare("SELECT parent_id, status FROM deck_comments WHERE id = ? AND target_kind = ? AND target_id = ?")
      .bind(parentId, target.kind, target.id).first<{ parent_id: string | null; status: string }>();
    if (!parent || parent.parent_id || parent.status === "hidden") throw badRequest("Replies must belong to a visible top-level comment");
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare("INSERT INTO deck_comments (id, target_kind, target_id, author_user_id, parent_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, target.kind, target.id, user.id, parentId, body, now, now).run();
  return { id };
}

export async function editComment(env: Env, user: AuthUser, id: string, value: unknown): Promise<void> {
  const body = cleanBody((value as { body?: unknown } | null)?.body);
  const current = await env.ACCOUNT_DB.prepare("SELECT body, status FROM deck_comments WHERE id = ? AND author_user_id = ?").bind(id, user.id).first<{ body: string; status: string }>();
  if (!current) throw new ApiError("Comment not found", 404, "comment_not_found");
  if (current.status !== "active") throw badRequest("Deleted comments cannot be edited");
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("INSERT INTO comment_edits (id, comment_id, body, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, current.body, now),
    env.ACCOUNT_DB.prepare("UPDATE deck_comments SET body = ?, updated_at = ? WHERE id = ? AND author_user_id = ?").bind(body, now, id, user.id),
  ]);
}

export async function deleteComment(env: Env, user: AuthUser, id: string): Promise<void> {
  const result = await env.ACCOUNT_DB.prepare("UPDATE deck_comments SET status = 'deleted', body = '', updated_at = ? WHERE id = ? AND author_user_id = ? AND status = 'active'")
    .bind(new Date().toISOString(), id, user.id).run();
  if (result.meta.changes !== 1) throw new ApiError("Comment not found", 404, "comment_not_found");
}

export async function reportComment(env: Env, user: AuthUser, id: string, value: unknown): Promise<void> {
  const input = value as { reason?: unknown; details?: unknown } | null;
  if (!input || typeof input.reason !== "string" || !REPORT_REASONS.has(input.reason as CommentReportReason)) throw badRequest("Invalid report reason");
  const details = typeof input.details === "string" ? input.details.trim().slice(0, 1_000) : "";
  const comment = await env.ACCOUNT_DB.prepare("SELECT author_user_id FROM deck_comments WHERE id = ? AND status = 'active'").bind(id).first<{ author_user_id: string }>();
  if (!comment) throw new ApiError("Comment not found", 404, "comment_not_found");
  if (comment.author_user_id === user.id) throw badRequest("You cannot report your own comment");
  const now = new Date().toISOString();
  const result = await env.ACCOUNT_DB.prepare("INSERT INTO comment_reports (id, comment_id, reporter_user_id, reason, details, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(comment_id, reporter_user_id) DO NOTHING")
    .bind(crypto.randomUUID(), id, user.id, input.reason, details, now, now).run();
  if (result.meta.changes !== 1) throw badRequest("You have already reported this comment");
}

export async function setThreadLocked(env: Env, user: AuthUser, target: DeckCommentTarget, locked: unknown): Promise<void> {
  if (typeof locked !== "boolean") throw badRequest("Locked must be a boolean");
  const thread = await ensureThread(env, target);
  const role = await env.ACCOUNT_DB.prepare("SELECT community_role FROM users WHERE id=?").bind(user.id).first<{ community_role: string }>();
  const mayModerate = role?.community_role === "moderator" || role?.community_role === "staff";
  if (thread.ownerUserId !== user.id && !mayModerate) throw new ApiError("Only the deck owner or a moderator can change comments", 403, "not_deck_owner");
  await env.ACCOUNT_DB.prepare("UPDATE deck_comment_threads SET locked = ?, updated_at = ? WHERE target_kind = ? AND target_id = ?")
    .bind(locked ? 1 : 0, new Date().toISOString(), target.kind, target.id).run();
}

export async function setBlock(env: Env, user: AuthUser, profileSlug: string, blocked: unknown): Promise<void> {
  if (typeof blocked !== "boolean") throw badRequest("Blocked must be a boolean");
  const target = await env.ACCOUNT_DB.prepare("SELECT id FROM users WHERE profile_slug = ?").bind(profileSlug).first<{ id: string }>();
  if (!target) throw new ApiError("Profile not found", 404, "profile_not_found");
  if (target.id === user.id) throw badRequest("You cannot block yourself");
  if (blocked) await env.ACCOUNT_DB.prepare("INSERT OR IGNORE INTO user_blocks (blocker_user_id, blocked_user_id, created_at) VALUES (?, ?, ?)").bind(user.id, target.id, new Date().toISOString()).run();
  else await env.ACCOUNT_DB.prepare("DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?").bind(user.id, target.id).run();
}
