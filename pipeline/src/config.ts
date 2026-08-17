const FAST_MODE = process.env.GATCG_FAST_MODE === "1";

/**
 * Central knobs for the pipeline. Omnidex has no bulk-listing endpoint — every event
 * is discovered by walking IDs one at a time — so these exist to keep a run's request
 * volume and runtime bounded and polite to a free public API. See pipeline/src/omnidex/README
 * for the numbers that justify the defaults.
 */
export const config = {
  fastMode: FAST_MODE,

  /** Skips pricing + Omnidex fetch and only runs the analysis build against whatever's already cached — lets analysis-only changes (e.g. similarity.ts) be tested/rerun without a full fetch. */
  analysisOnly: process.env.GATCG_ANALYSIS_ONLY === "1",

  /** Skips pricing + analysis and only runs the Omnidex crawl — lets a multi-year backfill be split into one fetch-only sub-process per year, with a single analysis run at the end over everything once all years are in the cache (analysis needs the full cross-year dataset to compute correct per-champion similarity groups, so it can't be split the same way). */
  fetchOnly: process.env.GATCG_FETCH_ONLY === "1",

  /** Initial Omnidex backfill is scoped to this year only (Phase 6); see Phase 12 for full history. */
  backfillYear: Number(process.env.GATCG_BACKFILL_YEAR ?? 2026),

  /**
   * Most Omnidex events are tiny weekly leagues (median ~5-7 players); deep-fetching every
   * one of the ~18k events/year would mean ~150k+ requests for a single backfill. Only events
   * at or above this size get the full players/standings/pairings/decklists fetch.
   */
  minEventPlayers: Number(process.env.GATCG_MIN_EVENT_PLAYERS ?? 8),

  /** Delay between Omnidex requests — politeness over speed; skipped entirely in fast mode. */
  crawlRequestDelayMs: FAST_MODE ? 0 : Number(process.env.GATCG_CRAWL_DELAY_MS ?? 150),

  /** Dev-iteration cap: only scan the most recent N event IDs instead of a full range. */
  fastModeEventLimit: Number(process.env.GATCG_FAST_MODE_EVENT_LIMIT ?? 25),

  /** How far below the last known max ID an incremental run re-checks for events that finished since. */
  incrementalLookbackIds: Number(process.env.GATCG_INCREMENTAL_LOOKBACK ?? 1000),

  /** Consecutive missing IDs before a crawl assumes it's past the real frontier and stops early. */
  new404StreakLimit: 20,

  /** Event dates aren't perfectly monotonic with ID — pad the binary-searched year boundary. */
  yearBoundarySafetyMargin: 100,

  /**
   * A match where the winner's Elo swing (from Omnidex's own per-match `eloChange`) exceeds
   * this is flagged as an upset. Using the API's own delta directly means we don't need to
   * separately track pre-match rating gaps — a big swing already means the system considered
   * the outcome surprising.
   */
  upsetEloSwingThreshold: Number(process.env.GATCG_UPSET_THRESHOLD ?? 20),

  /** Archetypes/matchups with fewer decks/games than this are noise — suppressed from published battle charts. */
  minBattleChartSampleSize: Number(process.env.GATCG_MIN_BATTLE_SAMPLE ?? 5),

  /**
   * Pseudo-count for shrinking a card's win rate toward 50% when it has few decklist
   * appearances — a card with 3 appearances at 100% shouldn't outrank one with 200 at 65%.
   * Concept adapted independently from Fractal of Insight's win-rate padding idea (not their
   * code/data, per the Phase 13 licensing note); this is a simple Bayesian-average version.
   */
  winRateShrinkagePriorWeight: Number(process.env.GATCG_WINRATE_SHRINKAGE ?? 10),
};
