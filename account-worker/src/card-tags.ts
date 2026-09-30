import { assertAllowedText } from "./content-policy";
import { canonicalCardTag, cardTagCategory, type CardTagsData, type TagOverride, type TagProposal, type TagProposalInput, type TagProposalList } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";
import { assetJson } from "./decks";

export function parseTagProposal(value: unknown): TagProposalInput {
  if (!value || typeof value !== "object") throw badRequest("Invalid tag proposal");
  const input = value as Record<string, unknown>;
  if (typeof input.id !== "string" || !/^[a-f0-9-]{36}$/.test(input.id)) throw badRequest("Invalid proposal ID");
  if (typeof input.tag !== "string" || !input.tag.trim() || input.tag.length > 100) throw badRequest("Choose an existing tag");
  if (input.action !== "add" && input.action !== "remove") throw badRequest("Invalid tag action");
  if (typeof input.reason !== "string" || input.reason.trim().length < 3 || input.reason.length > 1000) throw badRequest("Explain the suggestion in 3–1,000 characters");
  assertAllowedText(input.tag, "Tag");
  assertAllowedText(input.reason, "Tag explanation");
  if (!Array.isArray(input.targets) || !input.targets.length || input.targets.length > 50) throw badRequest("Select 1–50 cards or printings");
  const targets = input.targets.map((row: unknown) => {
    if (!row || typeof row !== "object") throw badRequest("Invalid target");
    const target = row as Record<string, unknown>;
    if (typeof target.cardUuid !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(target.cardUuid)) throw badRequest("Invalid card ID");
    if (target.editionUuid !== null && (typeof target.editionUuid !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(target.editionUuid))) throw badRequest("Invalid printing ID");
    if ((cardTagCategory(input.tag as string) === "Gameplay") !== (target.editionUuid === null)) throw badRequest("Gameplay tags apply to cards; other tags require a printing");
    return { cardUuid: target.cardUuid, editionUuid: target.editionUuid as string | null };
  }).sort((a, b) => `${a.cardUuid}:${a.editionUuid}`.localeCompare(`${b.cardUuid}:${b.editionUuid}`));
  if (new Set(targets.map(row => `${row.cardUuid}:${row.editionUuid}`)).size !== targets.length) throw badRequest("Duplicate targets");
  return { id: input.id, tag: canonicalCardTag(input.tag), action: input.action, targets, reason: input.reason.trim() };
}

export async function canReviewTags(env: Env, user: AuthUser): Promise<boolean> {
  const row = await env.ACCOUNT_DB.prepare("SELECT community_role FROM users WHERE id = ?").bind(user.id).first<{ community_role: string }>();
  return row?.community_role === "moderator" || row?.community_role === "staff";
}

async function validatePublishedTargets(env: Env, input: TagProposalInput) {
  let catalog: { cards: { uuid: string; editions: { uuid: string }[] }[] }; let tags: CardTagsData;
  try {
    [catalog, tags] = await Promise.all([assetJson<typeof catalog>(env, "/data/community/card-tag-targets.json"), assetJson<CardTagsData>(env, "/data/community/card-tags.json")]);
  } catch (error) {
    console.error("Tag validation asset fetch failed", error instanceof Error ? error.message : "Unknown error");
    throw new ApiError("Card and tag validation is temporarily unavailable. Your draft can be retried.", 503, "tag_catalog_unavailable"); }
  if (!tags.tags.some(tag => canonicalCardTag(tag.name) === input.tag)) throw badRequest("Choose an existing published tag");
  const cards = new Map(catalog.cards.map(card => [card.uuid, card]));
  for (const target of input.targets) {
    const card = cards.get(target.cardUuid);
    if (!card || (target.editionUuid && !card.editions.some(edition => edition.uuid === target.editionUuid))) throw badRequest("A selected card or printing is no longer available");
  }
}

interface Row { id: string; user_id: string | null; payload: string; status: TagProposal["status"]; created_at: string; reviewed_at: string | null }
const proposal = (row: Row): TagProposal => ({ ...JSON.parse(row.payload) as TagProposalInput, status: row.status, createdAt: row.created_at, reviewedAt: row.reviewed_at });

export async function submitTagProposal(env: Env, user: AuthUser, value: unknown): Promise<TagProposal> {
  const input = parseTagProposal(value);
  const payload = JSON.stringify(input);
  const existing = await env.ACCOUNT_DB.prepare("SELECT * FROM card_tag_proposals WHERE id = ?").bind(input.id).first<Row>();
  if (existing) {
    if (existing.user_id !== user.id || existing.payload !== payload) throw new ApiError("This submission ID is already in use", 409, "tag_proposal_conflict");
    return proposal(existing);
  }
  await validatePublishedTargets(env, input);
  const now = new Date().toISOString();
  await env.ACCOUNT_DB.prepare(`INSERT INTO card_tag_proposals (id, user_id, payload, created_at)
    SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM card_tag_proposals WHERE user_id = ? AND status = 'pending') < 100
    ON CONFLICT(id) DO NOTHING`).bind(input.id, user.id, payload, now, user.id).run();
  const saved = await env.ACCOUNT_DB.prepare("SELECT * FROM card_tag_proposals WHERE id = ?").bind(input.id).first<Row>();
  if (!saved) throw new ApiError("You have 100 pending submissions. Wait for review before submitting more.", 429, "tag_proposal_limit");
  if (saved.user_id !== user.id || saved.payload !== payload) throw new ApiError("This submission ID is already in use", 409, "tag_proposal_conflict");
  return proposal(saved);
}

export async function listTagProposals(env: Env, user: AuthUser, review: boolean, offset: number): Promise<TagProposalList> {
  const canReview = await canReviewTags(env, user);
  if (review && !canReview) throw new ApiError("Moderator access required", 403, "tag_review_forbidden");
  const rows = await env.ACCOUNT_DB.prepare(`SELECT * FROM card_tag_proposals WHERE ${review ? "status = 'pending'" : "user_id = ?"} ORDER BY created_at DESC, id LIMIT 51 OFFSET ?`)
    .bind(...(review ? [] : [user.id]), offset).all<Row>();
  return { proposals: rows.results.slice(0, 50).map(proposal), canReview, nextOffset: rows.results.length > 50 ? offset + 50 : null };
}

export async function listTagOverrides(env: Env): Promise<TagOverride[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT card_uuid AS cardUuid, NULLIF(edition_uuid, '') AS editionUuid, tag, action FROM card_tag_overrides").all<TagOverride>();
  return rows.results;
}

export async function reviewTagProposal(env: Env, user: AuthUser, id: string, value: unknown): Promise<void> {
  if (!await canReviewTags(env, user)) throw new ApiError("Moderator access required", 403, "tag_review_forbidden");
  const decision = value && typeof value === "object" ? (value as { decision?: unknown }).decision : null;
  if (decision !== "approved" && decision !== "rejected") throw badRequest("Choose approve or reject");
  const row = await env.ACCOUNT_DB.prepare("SELECT * FROM card_tag_proposals WHERE id = ?").bind(id).first<Row>();
  if (!row) throw new ApiError("Submission not found", 404, "tag_proposal_missing");
  if (row.status !== "pending") throw new ApiError("This submission has already been reviewed. Refresh the queue.", 409, "tag_already_reviewed");
  const input = decision === "approved" ? parseTagProposal(JSON.parse(row.payload)) : null;
  if (input) await validatePublishedTargets(env, input);
  const token = crypto.randomUUID();
  const statements = [env.ACCOUNT_DB.prepare("UPDATE card_tag_proposals SET status = ?, reviewed_at = ?, reviewer_id = ?, review_token = ? WHERE id = ? AND status = 'pending'").bind(decision, new Date().toISOString(), user.id, token, id)];
  if (input) for (const target of input.targets) statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO card_tag_overrides(card_uuid, edition_uuid, tag, action, proposal_id)
    SELECT ?, ?, ?, ?, ? FROM card_tag_proposals WHERE id = ? AND review_token = ?
    ON CONFLICT(card_uuid, edition_uuid, tag) DO UPDATE SET action = excluded.action, proposal_id = excluded.proposal_id`)
    .bind(target.cardUuid, target.editionUuid ?? "", input.tag, input.action, id, id, token));
  const results = await env.ACCOUNT_DB.batch(statements);
  if (results[0].meta.changes !== 1) throw new ApiError("This submission has already been reviewed. Refresh the queue.", 409, "tag_already_reviewed");
}
