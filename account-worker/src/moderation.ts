import type { DeckReportReason } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const REASONS = new Set<DeckReportReason>(["spam", "abuse", "copyright", "other"]);
const MAX_DETAILS_LENGTH = 1_000;

export async function reportDeck(env: Env, user: AuthUser, slug: string, value: unknown): Promise<{ reported: true }> {
  const input = value as { reason?: unknown; details?: unknown };
  if (typeof input.reason !== "string" || !REASONS.has(input.reason as DeckReportReason)) throw badRequest("Invalid report reason");
  if (input.details != null && typeof input.details !== "string") throw badRequest("Invalid report details");
  const details = (input.details ?? "").trim();
  if (details.length > MAX_DETAILS_LENGTH) throw badRequest("Report details must be 1,000 characters or fewer");
  const deck = await env.ACCOUNT_DB.prepare(`SELECT id, owner_user_id FROM user_decks
    WHERE public_slug = ? AND visibility IN ('public', 'unlisted') AND moderation_status = 'active'`)
    .bind(slug).first<{ id: string; owner_user_id: string }>();
  if (!deck) throw new ApiError("Deck not found", 404, "deck_not_found");
  if (deck.owner_user_id === user.id) throw badRequest("You cannot report your own deck", "own_deck_report");
  const now = new Date().toISOString();
  const result = await env.ACCOUNT_DB.prepare(`INSERT INTO deck_reports
    (id, reporter_user_id, deck_id, reason, details, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?, ?) ON CONFLICT(reporter_user_id, deck_id) DO NOTHING`)
    .bind(crypto.randomUUID(), user.id, deck.id, input.reason, details, now, now).run();
  if (result.meta.changes !== 1) throw badRequest("You have already reported this deck", "deck_already_reported");
  console.log(JSON.stringify({ level: "info", service: "fanofin-accounts", event: "deck_report_created", deckId: deck.id }));
  return { reported: true };
}
