import type { GamePlanRole } from "./gamePlanReadiness";
import { playtestDeckFingerprint } from "./playtestTracker";

type Line = { name: string; quantity: number };

export interface DeckAnalysisProfile {
  version: 2;
  deckFingerprint: string;
  revision: number;
  roles: Record<string, GamePlanRole | "">;
  reviewedAt: string | null;
  inheritedFrom: string | null;
  updatedAt: string;
}

const PREFIX = "fanofin:analysis-profile:v2:";
const LEGACY_PREFIX = "fanofin:analysis-profile:v1:";
const LATEST_PREFIX = "fanofin:analysis-profile:latest:v2:";
const fingerprint = (championName: string | null, mainLines: Line[]) => playtestDeckFingerprint(championName, mainLines);

export function analysisProfileKey(championName: string | null, mainLines: Line[]): string {
  return `${PREFIX}${fingerprint(championName, mainLines)}`;
}

const latestKey = (identity: string) => `${LATEST_PREFIX}${encodeURIComponent(identity.trim().toLowerCase())}`;

function validRoles(value: unknown, names: Set<string>): Record<string, GamePlanRole | ""> {
  if (!value || typeof value !== "object") return {};
  const roles: Record<string, GamePlanRole | ""> = {};
  for (const [name, role] of Object.entries(value)) if (names.has(name) && (role === "enabler" || role === "payoff" || role === "protection")) roles[name] = role;
  return roles;
}

function emptyProfile(deckFingerprint: string): DeckAnalysisProfile {
  return { version: 2, deckFingerprint, revision: 1, roles: {}, reviewedAt: null, inheritedFrom: null, updatedAt: new Date(0).toISOString() };
}

function parseProfile(raw: string | null, names: Set<string>, deckFingerprint: string): DeckAnalysisProfile | null {
  try {
    const parsed = JSON.parse(raw ?? "null") as Partial<DeckAnalysisProfile> | null;
    if (!parsed || parsed.version !== 2) return null;
    return { version: 2, deckFingerprint, revision: Number.isInteger(parsed.revision) && (parsed.revision ?? 0) > 0 ? parsed.revision! : 1, roles: validRoles(parsed.roles, names), reviewedAt: typeof parsed.reviewedAt === "string" ? parsed.reviewedAt : null, inheritedFrom: typeof parsed.inheritedFrom === "string" ? parsed.inheritedFrom : null, updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString() };
  } catch { return null; }
}

/** Exact deck version first; then unchanged names from the same named saved/imported deck. */
export function loadAnalysisProfile(storage: Storage, championName: string | null, mainLines: Line[], identity?: string | null): DeckAnalysisProfile {
  const deckFingerprint = fingerprint(championName, mainLines);
  const names = new Set(mainLines.map((line) => line.name));
  const exact = parseProfile(storage.getItem(analysisProfileKey(championName, mainLines)), names, deckFingerprint);
  if (exact) return exact;
  try {
    const legacy = JSON.parse(storage.getItem(`${LEGACY_PREFIX}${deckFingerprint}`) ?? "null") as { version?: number; roles?: unknown; updatedAt?: unknown } | null;
    if (legacy?.version === 1) return { ...emptyProfile(deckFingerprint), roles: validRoles(legacy.roles, names), updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString() };
  } catch { /* malformed legacy data is ignored */ }
  if (!identity?.trim()) return emptyProfile(deckFingerprint);
  const previousRaw = storage.getItem(latestKey(identity));
  const previousStored = parseProfile(previousRaw, names, deckFingerprint);
  let previousFingerprint: string | null = null;
  try { previousFingerprint = (JSON.parse(previousRaw ?? "null") as { deckFingerprint?: unknown } | null)?.deckFingerprint as string ?? null; } catch { /* ignored */ }
  if (!previousStored || !previousFingerprint || previousFingerprint === deckFingerprint) return emptyProfile(deckFingerprint);
  return { ...previousStored, deckFingerprint, revision: previousStored.revision + 1, reviewedAt: null, inheritedFrom: previousFingerprint, updatedAt: new Date(0).toISOString() };
}

export function saveAnalysisProfile(storage: Storage, championName: string | null, mainLines: Line[], profile: Pick<DeckAnalysisProfile, "roles" | "reviewedAt" | "revision" | "inheritedFrom">, identity?: string | null): DeckAnalysisProfile {
  const deckFingerprint = fingerprint(championName, mainLines);
  const names = new Set(mainLines.map((line) => line.name));
  const saved: DeckAnalysisProfile = { version: 2, deckFingerprint, revision: Math.max(1, Math.floor(profile.revision || 1)), roles: validRoles(profile.roles, names), reviewedAt: profile.reviewedAt, inheritedFrom: profile.inheritedFrom, updatedAt: new Date().toISOString() };
  const serialized = JSON.stringify(saved);
  storage.setItem(analysisProfileKey(championName, mainLines), serialized);
  if (identity?.trim()) storage.setItem(latestKey(identity), serialized);
  return saved;
}
