import type { GamePlanRole } from "./gamePlanReadiness";
import { playtestDeckFingerprint } from "./playtestTracker";

export interface DeckAnalysisProfile {
  version: 1;
  roles: Record<string, GamePlanRole | "">;
  updatedAt: string;
}

const PREFIX = "fanofin:analysis-profile:v1:";

export function analysisProfileKey(championName: string | null, mainLines: { name: string; quantity: number }[]): string {
  return `${PREFIX}${playtestDeckFingerprint(championName, mainLines)}`;
}

export function loadAnalysisProfile(storage: Storage, championName: string | null, mainLines: { name: string; quantity: number }[]): DeckAnalysisProfile {
  const names = new Set(mainLines.map((line) => line.name));
  try {
    const parsed = JSON.parse(storage.getItem(analysisProfileKey(championName, mainLines)) ?? "null") as Partial<DeckAnalysisProfile> | null;
    const roles: Record<string, GamePlanRole | ""> = {};
    if (parsed?.version === 1 && parsed.roles && typeof parsed.roles === "object") {
      for (const [name, role] of Object.entries(parsed.roles)) if (names.has(name) && (role === "" || role === "enabler" || role === "payoff" || role === "protection")) roles[name] = role;
    }
    return { version: 1, roles, updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString() };
  } catch {
    return { version: 1, roles: {}, updatedAt: new Date(0).toISOString() };
  }
}

export function saveAnalysisProfile(storage: Storage, championName: string | null, mainLines: { name: string; quantity: number }[], roles: Record<string, GamePlanRole | "">): void {
  const names = new Set(mainLines.map((line) => line.name));
  const retained = Object.fromEntries(Object.entries(roles).filter(([name, role]) => names.has(name) && role));
  storage.setItem(analysisProfileKey(championName, mainLines), JSON.stringify({ version: 1, roles: retained, updatedAt: new Date().toISOString() } satisfies DeckAnalysisProfile));
}
