import type { GamePlanRole } from "./gamePlanReadiness";
import type { SyncedAnalysisProfile } from "@gatcg/shared";
import { playtestDeckFingerprint } from "./playtestTracker";

type Line = { name: string; quantity: number };
export type StageUsefulness = "early" | "late" | "flexible" | "conditional";
export interface PressureMetadata { earliestTurn: number; repeatable: boolean; effectiveReserveCost: number }
export interface AnalysisPlan { id: string; name: string; roles: Record<string, GamePlanRole | "">; stageUsefulness: Record<string, StageUsefulness | "">; pressure: Record<string, PressureMetadata> }
export interface DeckAnalysisProfile extends SyncedAnalysisProfile { plans: AnalysisPlan[] }

const PREFIX = "fanofin:analysis-profile:v3:";
const V2_PREFIX = "fanofin:analysis-profile:v2:";
const LEGACY_PREFIX = "fanofin:analysis-profile:v1:";
const LATEST_PREFIX = "fanofin:analysis-profile:latest:v3:";
const V2_LATEST_PREFIX = "fanofin:analysis-profile:latest:v2:";
const fingerprint = (championName: string | null, mainLines: Line[]) => playtestDeckFingerprint(championName, mainLines);
export const activeAnalysisPlan = (profile: DeckAnalysisProfile) => profile.plans.find((plan) => plan.id === profile.activePlanId) ?? profile.plans[0];
export function analysisProfileKey(championName: string | null, mainLines: Line[]): string { return `${PREFIX}${fingerprint(championName, mainLines)}`; }
const latestKey = (identity: string) => `${LATEST_PREFIX}${encodeURIComponent(identity.trim().toLowerCase())}`;
const cleanName = (value: unknown, fallback = "Primary plan") => typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : fallback;
const planId = () => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function validRoles(value: unknown, names: Set<string>): Record<string, GamePlanRole | ""> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([name, role]) => names.has(name) && (role === "enabler" || role === "payoff" || role === "protection"))) as Record<string, GamePlanRole | "">;
}
function validStages(value: unknown, names: Set<string>): Record<string, StageUsefulness | ""> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([name, role]) => names.has(name) && ["early", "late", "flexible", "conditional"].includes(String(role)))) as Record<string, StageUsefulness | "">;
}
function validPressure(value: unknown, names: Set<string>): Record<string, PressureMetadata> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, PressureMetadata> = {};
  for (const [name, raw] of Object.entries(value)) { if (!names.has(name) || !raw || typeof raw !== "object") continue; const input = raw as Partial<PressureMetadata>; result[name] = { earliestTurn: Math.min(8, Math.max(1, Math.round(Number(input.earliestTurn) || 1))), repeatable: input.repeatable === true, effectiveReserveCost: Math.max(0, Math.round(Number(input.effectiveReserveCost) || 0)) }; }
  return result;
}
function validCosts(value: unknown, names: Set<string>): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([name, cost]) => names.has(name) && Number.isFinite(cost)).map(([name, cost]) => [name, Math.max(0, Math.round(Number(cost)))]));
}
function emptyProfile(deckFingerprint: string): DeckAnalysisProfile { const id = "primary"; return { version: 3, deckFingerprint, revision: 1, activePlanId: id, plans: [{ id, name: "Primary plan", roles: {}, stageUsefulness: {}, pressure: {} }], effectiveCosts: {}, reviewedAt: null, inheritedFrom: null, updatedAt: new Date(0).toISOString() }; }
function parseProfile(raw: string | null, names: Set<string>, deckFingerprint: string): DeckAnalysisProfile | null {
  try {
    const parsed = JSON.parse(raw ?? "null") as Record<string, unknown> | null;
    if (!parsed || (parsed.version !== 3 && parsed.version !== 2)) return null;
    const base = emptyProfile(deckFingerprint);
    const plans: AnalysisPlan[] = parsed.version === 2 ? [{ id: "primary", name: cleanName(parsed.planName), roles: validRoles(parsed.roles, names), stageUsefulness: {}, pressure: {} }] : (Array.isArray(parsed.plans) ? parsed.plans : []).slice(0, 12).flatMap((rawPlan, index) => { if (!rawPlan || typeof rawPlan !== "object") return []; const plan = rawPlan as Record<string, unknown>; return [{ id: typeof plan.id === "string" && plan.id ? plan.id.slice(0, 80) : `plan-${index + 1}`, name: cleanName(plan.name, `Plan ${index + 1}`), roles: validRoles(plan.roles, names), stageUsefulness: validStages(plan.stageUsefulness, names), pressure: validPressure(plan.pressure, names) }]; });
    const safePlans = plans.length ? plans : base.plans;
    const activePlanId = typeof parsed.activePlanId === "string" && safePlans.some((plan) => plan.id === parsed.activePlanId) ? parsed.activePlanId : safePlans[0].id;
    return { ...base, revision: Number.isInteger(parsed.revision) && Number(parsed.revision) > 0 ? Number(parsed.revision) : 1, activePlanId, plans: safePlans, effectiveCosts: validCosts(parsed.effectiveCosts, names), reviewedAt: typeof parsed.reviewedAt === "string" ? parsed.reviewedAt : null, inheritedFrom: typeof parsed.inheritedFrom === "string" ? parsed.inheritedFrom : null, updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : base.updatedAt };
  } catch { return null; }
}

export function cacheSyncedAnalysisProfile(storage: Storage, championName: string | null, mainLines: Line[], value: unknown, identity?: string | null): DeckAnalysisProfile | null {
  const deckFingerprint = fingerprint(championName, mainLines); const remoteFingerprint = value && typeof value === "object" && typeof (value as { deckFingerprint?: unknown }).deckFingerprint === "string" ? (value as { deckFingerprint: string }).deckFingerprint : null; const profile = parseProfile(JSON.stringify(value), new Set(mainLines.map((line) => line.name)), deckFingerprint);
  if (!profile) return null;
  const exact = { ...profile, deckFingerprint, inheritedFrom: remoteFingerprint === deckFingerprint ? profile.inheritedFrom : remoteFingerprint, reviewedAt: remoteFingerprint === deckFingerprint ? profile.reviewedAt : null, revision: remoteFingerprint === deckFingerprint ? profile.revision : profile.revision + 1 };
  const serialized = JSON.stringify(exact); storage.setItem(analysisProfileKey(championName, mainLines), serialized); if (identity?.trim()) storage.setItem(latestKey(identity), serialized);
  return exact;
}

export function newerAnalysisProfile(local: DeckAnalysisProfile, remote: DeckAnalysisProfile): DeckAnalysisProfile {
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}

/** Exact deck version first; then unchanged card metadata from the same named saved/imported deck. */
export function loadAnalysisProfile(storage: Storage, championName: string | null, mainLines: Line[], identity?: string | null): DeckAnalysisProfile {
  const deckFingerprint = fingerprint(championName, mainLines); const names = new Set(mainLines.map((line) => line.name));
  const exact = parseProfile(storage.getItem(analysisProfileKey(championName, mainLines)) ?? storage.getItem(`${V2_PREFIX}${deckFingerprint}`), names, deckFingerprint); if (exact) return exact;
  try { const legacy = JSON.parse(storage.getItem(`${LEGACY_PREFIX}${deckFingerprint}`) ?? "null") as { version?: number; roles?: unknown; updatedAt?: unknown } | null; if (legacy?.version === 1) return { ...emptyProfile(deckFingerprint), plans: [{ ...emptyProfile(deckFingerprint).plans[0], roles: validRoles(legacy.roles, names) }], updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString() }; } catch { /* ignore malformed legacy data */ }
  if (!identity?.trim()) return emptyProfile(deckFingerprint);
  const previousRaw = storage.getItem(latestKey(identity)) ?? storage.getItem(`${V2_LATEST_PREFIX}${encodeURIComponent(identity.trim().toLowerCase())}`);
  const previous = parseProfile(previousRaw, names, deckFingerprint); let previousFingerprint: string | null = null;
  try { const value = (JSON.parse(previousRaw ?? "null") as { deckFingerprint?: unknown } | null)?.deckFingerprint; previousFingerprint = typeof value === "string" ? value : null; } catch { /* ignore */ }
  if (!previous || !previousFingerprint || previousFingerprint === deckFingerprint) return emptyProfile(deckFingerprint);
  return { ...previous, deckFingerprint, revision: previous.revision + 1, reviewedAt: null, inheritedFrom: previousFingerprint, updatedAt: new Date(0).toISOString() };
}
export function saveAnalysisProfile(storage: Storage, championName: string | null, mainLines: Line[], profile: Omit<DeckAnalysisProfile, "version" | "deckFingerprint" | "updatedAt">, identity?: string | null): DeckAnalysisProfile {
  const deckFingerprint = fingerprint(championName, mainLines); const names = new Set(mainLines.map((line) => line.name)); const parsed = parseProfile(JSON.stringify({ ...profile, version: 3 }), names, deckFingerprint) ?? emptyProfile(deckFingerprint); const saved = { ...parsed, deckFingerprint, updatedAt: new Date().toISOString() }; const serialized = JSON.stringify(saved); storage.setItem(analysisProfileKey(championName, mainLines), serialized); if (identity?.trim()) storage.setItem(latestKey(identity), serialized); return saved;
}
export function addAnalysisPlan(profile: DeckAnalysisProfile, name = "New plan"): DeckAnalysisProfile { const id = planId(); return { ...profile, activePlanId: id, plans: [...profile.plans, { id, name: cleanName(name), roles: {}, stageUsefulness: {}, pressure: {} }], reviewedAt: null }; }
export function removeAnalysisPlan(profile: DeckAnalysisProfile, id: string): DeckAnalysisProfile { if (profile.plans.length <= 1) return profile; const plans = profile.plans.filter((plan) => plan.id !== id); return { ...profile, plans, activePlanId: profile.activePlanId === id ? plans[0].id : profile.activePlanId, reviewedAt: null }; }
