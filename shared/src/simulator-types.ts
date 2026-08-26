/**
 * Aggregate stats from the Clarent match-ingestion Worker's public analytics endpoint
 * (`GET /v1/grand-archive/analytics/summary`), published as `data/simulator/summary.json` by
 * `pipeline/src/simulator/export.ts`. This is anonymous simulator telemetry — a genuinely
 * different population from real tournament results (see the deck-sightings-derived datasets),
 * never blended into tournament win rates/Card Impact. `championId` is TCGEngine's stable card
 * identifier; Clarent supplies the corresponding display name when available.
 */
export interface SimulatorSummary {
  schemaVersion: 1;
  source: "GrandArchiveSim";
  generatedAt: string;
  games: number;
  firstPlayer: { games: number; wins: number; winRate: number | null };
  /** Overall average, across every game — not sample-gated like cardStats/turnStats/weapons below (see their doc comment for why). Null when `games` is 0. */
  avgTurns: number | null;
  champions: Array<{
    championId: string;
    championName: string | null;
    element: string;
    games: number;
    wins: number;
    winRate: number | null;
  }>;
  matchups: Array<{
    champion1: string;
    champion1Name: string | null;
    champion2: string;
    champion2Name: string | null;
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
    /** Times this card was the source of a lethal `damage_resolved` event — i.e. landed the killing blow. */
    lethalHits: number;
  }>;
  /** Per-weapon attack usage (from combatEvents' `weaponCardId`), same minimum-sample-games gate as `cardStats`. */
  weapons: Array<{
    weaponCardId: string;
    games: number;
    attackEvents: number;
    /** Share of this weapon's attacks that had `cleave: true`. */
    cleaveRate: number;
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
