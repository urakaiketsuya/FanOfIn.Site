export type MatchResult = "win" | "loss" | "draw";
export type MatchOrder = "first" | "second" | "unknown";

export type MatchProvenance =
  | { kind: "manual"; enteredAt: string }
  | { kind: "clarent"; schemaVersion: 1; submissionId: string; matchId: string; gameNumber: number; importedAt: string; sourceVersion: string; playerSeat: 1 | 2; playerChampionId: string; opponentChampionId: string; cardIds: string[]; cardIdMappings?: Record<string, string> };

export interface MatchLogRecord {
  version: 1;
  id: string;
  playedAt: string;
  result: MatchResult;
  order: MatchOrder;
  turns: number | null;
  mulligans: number | null;
  opponent: string;
  deckLabel: string;
  savedDeckId?: string | null;
  sideboardPlan: string;
  gamePlanTurn: number | null;
  notableCards: string[];
  bottlenecks: string[];
  notes: string;
  provenance: MatchProvenance;
}
