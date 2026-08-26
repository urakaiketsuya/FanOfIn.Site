/**
 * Aggregate stats from the Clarent match-ingestion Worker's public analytics endpoint
 * (`GET /v1/grand-archive/analytics/summary`), published as `data/simulator/summary.json` by
 * `pipeline/src/simulator/export.ts`. This is anonymous simulator telemetry — a genuinely
 * different population from real tournament results (see the deck-sightings-derived datasets),
 * never blended into tournament win rates/Card Impact. `championId` is TCGEngine's own internal
 * card identifier, not this project's card `slug`/`name` — there is currently no known mapping
 * from one to the other, so callers should not assume a champion id resolves to a catalog card.
 */
export interface SimulatorSummary {
  schemaVersion: 1;
  source: "GrandArchiveSim";
  generatedAt: string;
  games: number;
  firstPlayer: { games: number; wins: number; winRate: number | null };
  champions: Array<{
    championId: string;
    element: string;
    games: number;
    wins: number;
    winRate: number | null;
  }>;
  matchups: Array<{
    champion1: string;
    champion2: string;
    games: number;
    champion1Wins: number;
    champion2Wins: number;
  }>;
  /**
   * Per-card telemetry (from cardStats/combatEvents), only for cards with at least
   * `MIN_SAMPLE_GAMES` (worker/src/analytics.ts) distinct games behind them — below that
   * threshold an "aggregate" would just be replaying one specific game's exact card usage, not
   * actually aggregating anything. Expect this to be empty until real match volume grows.
   */
  cardStats: Array<{
    cardId: string;
    games: number;
    avgDrawn: number;
    avgDrawnToMemory: number;
    avgMaterialized: number;
    avgReserved: number;
    avgDiscarded: number;
    avgActivated: number;
    winRate: number | null;
    attackEvents: number;
    avgDamageDealt: number;
  }>;
  /** Per-turn telemetry (from turnStats), same minimum-sample-games gate as `cardStats`. */
  turnStats: Array<{
    turn: number;
    games: number;
    avgCardsPlayed: number;
    avgMemorySpent: number;
    avgReserveSpent: number;
    avgDamageDealt: number;
    avgDamageTaken: number;
    avgHealed: number;
    avgLevel: number;
    avgHp: number;
  }>;
}
