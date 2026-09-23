export interface SyncedAnalysisProfile {
  version: 3;
  deckFingerprint: string;
  revision: number;
  activePlanId: string;
  plans: Array<{
    id: string;
    name: string;
    roles: Record<string, "enabler" | "payoff" | "protection" | "">;
    stageUsefulness: Record<string, "early" | "late" | "flexible" | "conditional" | "">;
    pressure: Record<string, { earliestTurn: number; repeatable: boolean; effectiveReserveCost: number }>;
  }>;
  effectiveCosts: Record<string, number>;
  reviewedAt: string | null;
  inheritedFrom: string | null;
  updatedAt: string;
}

export interface AnalysisProfileSyncRecord {
  identity: string | null;
  profile: SyncedAnalysisProfile;
}
