import type { ProfileShowcase } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";
import { assetJson } from "./assets";

export function parseShowcase(value: unknown): ProfileShowcase {
  if (!value || typeof value !== "object") throw badRequest("Invalid profile showcase");
  const input = value as Record<string, unknown>;
  function ids(key: string, max: number, pattern: RegExp) {
    const list = input[key];
    if (!Array.isArray(list) || list.length > max || list.some(id => typeof id !== "string" || !pattern.test(id)) || new Set(list).size !== list.length) throw badRequest(`Invalid ${key}`);
    return list as string[];
  }
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 0) throw badRequest("Invalid profile revision");
  return { cardIds: ids("cardIds", 6, /^[a-zA-Z0-9-]{1,80}$/), deckSlugs: ids("deckSlugs", 3, /^[a-f0-9]{32}$/), revision: Number(input.revision) };
}
export async function getShowcase(env: Env, userId: string): Promise<ProfileShowcase> {
  const row = await env.ACCOUNT_DB.prepare("SELECT payload, revision FROM profile_showcases WHERE user_id = ?").bind(userId).first<{ payload: string; revision: number }>();
  return row ? { ...JSON.parse(row.payload), revision: row.revision } : { cardIds: [], deckSlugs: [], revision: 0 };
}
export async function saveShowcase(env: Env, user: AuthUser, value: unknown): Promise<ProfileShowcase> {
  const input = parseShowcase(value);
  if (input.cardIds.length) {
    const catalog = await assetJson<{ cards: { uuid: string }[] }>(env, "/data/community/card-tag-targets.json");
    const ids = new Set(catalog.cards.map(card => card.uuid));
    if (input.cardIds.some(id => !ids.has(id))) throw badRequest("Choose cards from the published catalog");
  }
  const payload = JSON.stringify({ cardIds: input.cardIds, deckSlugs: input.deckSlugs });
  // Public visibility is checked inside the write, including when a deck is unpublished concurrently.
  const result = await env.ACCOUNT_DB.prepare(`INSERT INTO profile_showcases (user_id, payload, revision)
    SELECT ?, ?, 1 WHERE (? = 0 OR EXISTS (SELECT 1 FROM profile_showcases WHERE user_id = ?))
    AND NOT EXISTS (SELECT 1 FROM json_each(?) chosen WHERE NOT EXISTS (
      SELECT 1 FROM user_decks ud JOIN users owner ON owner.id = ud.owner_user_id
      WHERE ud.public_slug = chosen.value AND ud.visibility = 'public' AND ud.moderation_status = 'active'
      AND ud.published_version_id IS NOT NULL AND owner.profile_discoverable = 1))
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, revision = profile_showcases.revision + 1
    WHERE profile_showcases.revision = ?
    RETURNING revision`).bind(user.id, payload, input.revision, user.id, JSON.stringify(input.deckSlugs), input.revision).first<{ revision: number }>();
  if (!result) {
    const current = await getShowcase(env, user.id);
    // A lost successful response can be retried without duplicating the write.
    if (JSON.stringify({ cardIds: current.cardIds, deckSlugs: current.deckSlugs }) === payload && current.revision > input.revision) return current;
    throw new ApiError("The profile changed elsewhere or a deck is no longer public. Reload the saved showcase before retrying.", 409, "profile_showcase_conflict");
  }
  return { ...input, revision: result.revision };
}
