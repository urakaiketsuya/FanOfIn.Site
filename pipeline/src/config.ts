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

  /** Writes pipeline-internal debug artifacts (e.g. deckCardIndex.ts's uncompressed ~89MB
   * deck-card-index-full.json) that a normal run skips — not read by anything downstream,
   * just useful when debugging or regenerating the published encoded form by hand. */
  debugArtifacts: process.env.GATCG_DEBUG_ARTIFACTS === "1",

  /** Skips just the pricing step (Omnidex crawl + analysis still run) — lets the daily data-refresh
   * schedule keep pricing/price-history on their original once-a-week cadence (PRICE_HISTORY_MAX_POINTS
   * assumes weekly snapshots for its ~1 year lookback) without also slowing the Omnidex crawl down to
   * weekly. See .github/workflows/data-refresh.yml, which sets this on every day but Monday. */
  skipPricing: process.env.GATCG_SKIP_PRICING === "1",

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

  /**
   * A card only gets a published win-rate "lift" figure within a build if both its "with" and
   * "without" sightings meet this bar — same magnitude as `minBattleChartSampleSize`, appropriate
   * since named-build clusters are already small populations (see archetypeTaxonomy.ts). This
   * also has the side effect of excluding a cluster's own defining/staple cards from ever
   * appearing as a "suggestion": they're in ~100% of the cluster's decks by construction, so the
   * "without" bucket almost never has enough data to clear this bar.
   */
  cardImpactMinSampleSize: Number(process.env.GATCG_CARD_IMPACT_MIN_SAMPLE ?? 5),

  /**
   * ShoutAtYourDecks (community deck-builder, see pipeline/src/shoutatyourdecks/README.md) has no
   * bulk-listing API — the listing and every deck page only render after a live Blazor SignalR
   * circuit, so harvesting URLs and fetching full decklists both need a real browser (Playwright).
   * Only the cheap metadata fetch (title/author/champion/counts, baked into each deck page's
   * server-prerendered HTML) is plain HTTP. These knobs keep both the browser and HTTP phases
   * bounded and polite, same spirit as the Omnidex knobs above.
   */

  /** Delay between ShoutAtYourDecks HTTP metadata fetches — politeness over speed; skipped in fast mode. */
  sydCrawlRequestDelayMs: FAST_MODE ? 0 : Number(process.env.GATCG_SYD_CRAWL_DELAY_MS ?? 250),

  /**
   * Valid constructed decks are 60 cards or more in the Main deck (most are exactly 60); anything
   * under that is an unfinished/invalid brew, not a "potential deck" — filtered out before a
   * decklist is ever worth the browser cost of fetching. See docs/CALCULATIONS.md.
   */
  sydMinMainDeckSize: Number(process.env.GATCG_SYD_MIN_MAIN_DECK_SIZE ?? 60),

  /**
   * Deck titles containing this (case-insensitive) are almost always scratch duplicates a user
   * made while editing (e.g. "Untitled Deck - Copy") rather than a deck meant to be shared —
   * confirmed against a live sample: every title matching this was junk, no false positives seen.
   */
  sydTitleExcludePattern: process.env.GATCG_SYD_TITLE_EXCLUDE_PATTERN ?? "copy",

  /** How many browser pages/decks to process concurrently during harvest/decklist phases — bounded to stay polite to a small fan-run server. */
  sydBrowserConcurrency: Number(process.env.GATCG_SYD_BROWSER_CONCURRENCY ?? 2),

  /** Dev-iteration cap: only harvest this many listing pages (24 decks/page) instead of the full ~891. */
  sydFastModePageLimit: Number(process.env.GATCG_SYD_FAST_MODE_PAGE_LIMIT ?? 3),

  /** Per-champion breakdowns (card inclusion, price distribution) are suppressed below this many decks — same magnitude/reasoning as `minBattleChartSampleSize` above: a handful of decks isn't a real signal. */
  sydMinChampionSampleSize: Number(process.env.GATCG_SYD_MIN_CHAMPION_SAMPLE ?? 5),

  /** An archetype cluster (decks sharing the exact same champion + main+material card list) is only published if at least this many decks share it — a cluster of 1 is just "a deck exists," not a recurring build. */
  sydMinArchetypeClusterSize: Number(process.env.GATCG_SYD_MIN_ARCHETYPE_CLUSTER ?? 2),

  /**
   * sleeved.gg (second community deck-builder source, see pipeline/src/sleeved/README.md) is a real
   * REST API (`X-API-Key` header) — no browser needed, unlike ShoutAtYourDecks. `sleevedApiKey` is
   * `null` when unset (e.g. CI before the repo secret is added); every Sleeved-mode entry point
   * checks for that and throws a clear error rather than silently no-op'ing, same spirit as
   * `simulator/export.ts`'s `GATCG_SIMULATOR_API_URL` check.
   */
  sleevedApiKey: process.env.SLEEVED_API_KEY ?? null,

  /** Same deck-identity floor as `sydMinMainDeckSize` — see docs/CALCULATIONS.md. */
  sleevedMinMainDeckSize: Number(process.env.GATCG_SLEEVED_MIN_MAIN_DECK_SIZE ?? 60),

  /** Politeness delay between Sleeved API calls (listing pages + bulk-details batches) — skipped in fast mode. */
  sleevedCrawlRequestDelayMs: FAST_MODE ? 0 : Number(process.env.GATCG_SLEEVED_CRAWL_DELAY_MS ?? 250),

  /** Dev-iteration cap: only harvest this many deck ids from the public listing instead of the full set. */
  sleevedFastModeDeckLimit: Number(process.env.GATCG_SLEEVED_FAST_MODE_DECK_LIMIT ?? 50),

  /**
   * tcgarchitect.com (third community deck-builder source, see pipeline/src/tcgarchitect/README.md)
   * needs a real browser (Playwright) for its `/grand-archive/discover` listing — that page has no
   * server-rendered data at all, and the API it calls client-side requires a bundled key on a path
   * `robots.txt` disallows automating directly. Unlike ShoutAtYourDecks, that one page load already
   * carries every deck's complete decklist, so there's no separate decklist-fetch phase/knobs here.
   */

  /** Delay between discover-listing page loads — politeness over speed; skipped in fast mode. */
  tcgaCrawlRequestDelayMs: FAST_MODE ? 0 : Number(process.env.GATCG_TCGA_CRAWL_DELAY_MS ?? 250),

  /** Same deck-identity floor as `sydMinMainDeckSize`/`sleevedMinMainDeckSize` — see docs/CALCULATIONS.md. */
  tcgaMinMainDeckSize: Number(process.env.GATCG_TCGA_MIN_MAIN_DECK_SIZE ?? 60),

  /** Dev-iteration cap: only harvest this many listing pages (48 decks/page) instead of the full set. */
  tcgaFastModePageLimit: Number(process.env.GATCG_TCGA_FAST_MODE_PAGE_LIMIT ?? 2),
};
