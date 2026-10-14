import { collectionProgressKey, parseCollectionProgressGoals } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { badRequest, ApiError } from "./errors";

export async function listCollectionProgressGoals(env: Env, user: AuthUser) {
  const rows = await env.ACCOUNT_DB.prepare("SELECT goal_json FROM collection_progress_goals WHERE user_id = ? ORDER BY goal_key").bind(user.id).all<{ goal_json: string }>();
  return { userId: user.id, goals: rows.results.flatMap(row => parseCollectionProgressGoals(`[${row.goal_json}]`)) };
}

export async function saveCollectionProgressGoals(env: Env, user: AuthUser, value: unknown) {
  const input = value as { expectedUserId?: unknown; goals?: unknown; pinned?: unknown } | null;
  if (input?.expectedUserId !== user.id) throw new ApiError("Account changed. Refresh your goals before saving.", 409, "account_changed");
  if (typeof input.pinned !== "boolean" || !Array.isArray(input.goals) || input.goals.length < 1 || input.goals.length > 100) throw badRequest("Invalid collection goals");
  let goals;
  try { goals = parseCollectionProgressGoals(JSON.stringify(input.goals)); }
  catch { throw badRequest("Invalid collection goals"); }
  // Each command changes only the named goals. Atomic batches preserve unrelated device writes.
  await env.ACCOUNT_DB.batch(goals.map(goal => input.pinned
    ? env.ACCOUNT_DB.prepare("INSERT INTO collection_progress_goals (user_id, goal_key, goal_json) VALUES (?, ?, ?) ON CONFLICT(user_id, goal_key) DO NOTHING")
      .bind(user.id, collectionProgressKey(goal), JSON.stringify(goal))
    : env.ACCOUNT_DB.prepare("DELETE FROM collection_progress_goals WHERE user_id = ? AND goal_key = ?")
      .bind(user.id, collectionProgressKey(goal))));
  return listCollectionProgressGoals(env, user);
}
