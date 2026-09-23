import type { AnalysisProfileSyncRecord, SyncedAnalysisProfile } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { badRequest } from "./errors";

const MAX_PROFILE_BYTES = 200_000;
const validFingerprint = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9]{1,64}$/i.test(value);
const cleanIdentity = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim().slice(0, 200).toLowerCase() : null;

export function parseAnalysisProfileInput(value: unknown): AnalysisProfileSyncRecord {
  if (!value || typeof value !== "object") throw badRequest("Invalid analysis profile");
  const input = value as { identity?: unknown; profile?: unknown };
  if (!input.profile || typeof input.profile !== "object") throw badRequest("Invalid analysis profile");
  const profile = input.profile as SyncedAnalysisProfile;
  if (profile.version !== 3 || !validFingerprint(profile.deckFingerprint) || !Number.isInteger(profile.revision) || profile.revision < 1 || !Array.isArray(profile.plans) || profile.plans.length < 1 || profile.plans.length > 12) throw badRequest("Invalid analysis profile");
  if (typeof profile.activePlanId !== "string" || !profile.plans.some((plan) => plan?.id === profile.activePlanId) || typeof profile.updatedAt !== "string" || !Number.isFinite(Date.parse(profile.updatedAt))) throw badRequest("Invalid analysis profile metadata");
  for (const plan of profile.plans) {
    if (!plan || typeof plan.id !== "string" || !plan.id || plan.id.length > 80 || typeof plan.name !== "string" || !plan.name.trim() || plan.name.length > 80 || !plan.roles || typeof plan.roles !== "object" || !plan.stageUsefulness || typeof plan.stageUsefulness !== "object" || !plan.pressure || typeof plan.pressure !== "object") throw badRequest("Invalid analysis plan");
  }
  if (!profile.effectiveCosts || typeof profile.effectiveCosts !== "object" || JSON.stringify(profile).length > MAX_PROFILE_BYTES) throw badRequest("Analysis profile is too large");
  return { identity: cleanIdentity(input.identity), profile };
}

export async function getAnalysisProfile(env: Env, user: AuthUser, fingerprint: string, identity: string | null): Promise<AnalysisProfileSyncRecord | null> {
  if (!validFingerprint(fingerprint)) throw badRequest("Invalid deck fingerprint");
  let row = await env.ACCOUNT_DB.prepare("SELECT deck_identity, profile_json FROM analysis_profiles WHERE user_id = ? AND deck_fingerprint = ?").bind(user.id, fingerprint).first<Record<string, string | null>>();
  const normalizedIdentity = cleanIdentity(identity);
  if (!row && normalizedIdentity) row = await env.ACCOUNT_DB.prepare("SELECT deck_identity, profile_json FROM analysis_profiles WHERE user_id = ? AND deck_identity = ? ORDER BY updated_at DESC LIMIT 1").bind(user.id, normalizedIdentity).first<Record<string, string | null>>();
  if (!row?.profile_json) return null;
  try { return { identity: row.deck_identity, profile: JSON.parse(row.profile_json) as SyncedAnalysisProfile }; }
  catch { return null; }
}

export async function upsertAnalysisProfile(env: Env, user: AuthUser, value: unknown): Promise<AnalysisProfileSyncRecord> {
  const record = parseAnalysisProfileInput(value);
  const serialized = JSON.stringify(record.profile);
  await env.ACCOUNT_DB.prepare(`INSERT INTO analysis_profiles (user_id, deck_fingerprint, deck_identity, revision, profile_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, deck_fingerprint) DO UPDATE SET deck_identity = excluded.deck_identity, revision = excluded.revision,
      profile_json = excluded.profile_json, updated_at = excluded.updated_at
    WHERE excluded.updated_at >= analysis_profiles.updated_at`)
    .bind(user.id, record.profile.deckFingerprint, record.identity, record.profile.revision, serialized, record.profile.updatedAt).run();
  return record;
}

export async function listAnalysisProfiles(env: Env, user: AuthUser): Promise<AnalysisProfileSyncRecord[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT deck_identity, profile_json FROM analysis_profiles WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, string | null>>();
  return rows.results.flatMap((row) => { try { return [{ identity: row.deck_identity, profile: JSON.parse(row.profile_json!) as SyncedAnalysisProfile }]; } catch { return []; } });
}
