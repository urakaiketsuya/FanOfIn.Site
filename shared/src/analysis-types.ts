/** Published by the pipeline's analysis engines (data/analysis/*.json). */

// ---------------------------------------------------------------------------
// Elo ratings (pipeline/src/analysis/elo.ts)
// ---------------------------------------------------------------------------

export interface PlayerRating {
  playerId: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  lastEventId: number;
  lastEventDate: string;
}

export interface UpsetMatch {
  eventId: number;
  eventName: string;
  eventDate: string;
  round: number;
  winnerId: number;
  loserId: number;
  eloSwing: number;
}

export interface EloData {
  generatedAt: string;
  ratings: PlayerRating[];
  upsets: UpsetMatch[];
}

/** One player's rating right after finishing an event (collapses that event's Swiss-round-by-round swings into one point). */
export interface RatingCheckpoint {
  eventId: number;
  date: string;
  rating: number;
}

/**
 * Published separately from EloData (not folded in) — `elo.json` is fetched broadly (leaderboards,
 * achievements), while a player's full rating trajectory is only ever needed on that one player's
 * own profile page. Unlike price history, this needs no cap or cross-run accumulation: every
 * historical match is already replayed from scratch each run, so the full trajectory is derivable
 * in one pass and its size is naturally bounded by real event counts, not by how many pipeline runs
 * have happened.
 */
export interface EloHistoryData {
  generatedAt: string;
  /** Keyed by playerId (as a string, JSON round-trip convention — same as VodsData.vods). Chronological oldest-first. */
  history: Record<string, RatingCheckpoint[]>;
}

// ---------------------------------------------------------------------------
// Meta-wide per-card win-rate stats (pipeline/src/analysis/cardStats.ts)
// ---------------------------------------------------------------------------

export interface CardStat {
  name: string;
  slug: string | null;
  deckCount: number;
  totalCopies: number;
  eventCount: number;
  avgWinRate: number;
  /** avgWinRate shrunk toward 50% proportional to sample size — a fairer sort key than raw win rate for small-sample cards. */
  adjustedWinRate: number;
  recentDeckCount: number;
  priorDeckCount: number;
  marketPrice: number | null;
}

export interface CardStatsData {
  generatedAt: string;
  cards: CardStat[];
  /** Same shape, scoped to one Omnidex event category (worlds/nationals/ascent/regionals/store-championships/regular) — only present for categories with at least one qualifying event. */
  byCategory: Record<string, CardStat[]>;
  /** Total real decks this file's `cards` stats were computed over — lets a consumer derive "% of
   * tournament decks" (e.g. deckCount / decksConsidered) without fetching the much larger per-deck
   * datasets (deck-popularity-index.json, deck-sightings.json) just for their `.length`. */
  decksConsidered: number;
}

// ---------------------------------------------------------------------------
// Archetypes / Battle Chart — the older, coarser per-Champion rollup
// (pipeline/src/analysis/archetypes.ts). Not the same thing as ArchetypeCluster
// / ArchetypeTaxonomyData further below — see that section's own banner.
// ---------------------------------------------------------------------------

export interface ArchetypeSampleDeck {
  eventId: number;
  player: number;
}

/** Top cards for decks built around one specific Spirit companion card (e.g. "Spirit of Water"). */
export interface ArchetypeSpiritBreakdown {
  spiritName: string;
  /** The Spirit's element (e.g. "WATER"), or "NORM" for elementless Spirits. */
  spiritElement: string | null;
  deckCount: number;
  topCards: TopCardsBySection;
}

/** Top cards aggregated across every Spirit sharing one element — coarser than `spirits`. */
export interface ArchetypeElementBreakdown {
  element: string;
  deckCount: number;
  topCards: TopCardsBySection;
}

/**
 * A deck "archetype" here is its Champion's character name (e.g. "Alice"), read off the
 * CHAMPION-typed cards in the deck's Material Deck (see decklists.ts in the pipeline for how
 * that's extracted — Omnidex has no dedicated Champion field). `signature` falls back to a
 * class+element combo for the rare deck with no identifiable champion.
 */
export interface ArchetypeSummary {
  signature: string;
  classes: string[];
  elements: string[];
  deckCount: number;
  eventCount: number;
  avgWinRate: number;
  sampleDecks: ArchetypeSampleDeck[];
  /** Most-played cards within this champion's decks specifically — capped per section, not the full list. */
  topCards: TopCardsBySection;
  /** Same breakdown, sliced per Spirit companion card — a champion's Spirit pick can drastically change deck composition. Sorted by deckCount desc; empty if no deck had an identifiable Spirit. */
  spirits: ArchetypeSpiritBreakdown[];
  /** Same breakdown, sliced per Spirit element (coarser than `spirits`, groups e.g. "Spirit of Water" and "Spirit of Fortuitous Water" together). Sorted by deckCount desc. */
  elementBreakdown: ArchetypeElementBreakdown[];
}

export interface BattleChartEntry {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  ties: number;
  games: number;
}

export interface ArchetypeData {
  generatedAt: string;
  archetypes: ArchetypeSummary[];
  /**
   * Named Spirit companion cards (e.g. "Kaze, Spirit of Wind" — has a personal name, unlike the
   * generic "Spirit of Wind"), treated as their own Champion-like identity with the same full
   * stats shape, aggregated across every deck that runs them regardless of which real Champion
   * (if any) is present. Same list this data used to nest under each Champion's `spirits` field,
   * but promoted to first-class entries in their own right rather than requiring a detour through
   * a specific Champion's page to see. `spirits`/`elementBreakdown` are always empty here — a
   * Spirit doesn't have its own sub-Spirits.
   */
  namedSpirits: ArchetypeSummary[];
  battleChart: BattleChartEntry[];
}

// ---------------------------------------------------------------------------
// Hipster / novelty score (pipeline/src/analysis/hipster.ts)
// ---------------------------------------------------------------------------

export interface DeckHipsterScore {
  eventId: number;
  eventName: string;
  eventDate: string;
  player: number;
  championName: string;
  score: number;
}

export interface PlayerHipsterScore {
  playerId: number;
  avgScore: number;
  deckCount: number;
}

export interface HipsterData {
  generatedAt: string;
  deckScores: DeckHipsterScore[];
  playerScores: PlayerHipsterScore[];
}

// ---------------------------------------------------------------------------
// Deck similarity (pipeline/src/analysis/similarity.ts)
// ---------------------------------------------------------------------------

export interface SimilarDeck {
  deckId: string;
  eventId: number;
  eventName: string;
  player: number;
  score: number;
}

export interface DeckSimilarityEntry {
  deckId: string;
  eventId: number;
  eventName: string;
  player: number;
  championName: string;
  topMatches: SimilarDeck[];
}

export interface SimilarityData {
  generatedAt: string;
  decks: DeckSimilarityEntry[];
}

// ---------------------------------------------------------------------------
// Player profiles (pipeline/src/analysis/playerDecks.ts, rivals.ts)
// ---------------------------------------------------------------------------

export interface PlayerTopChampion {
  name: string;
  deckCount: number;
}

export interface PlayerTopCard {
  name: string;
  slug: string | null;
  /** Decks containing this card at least once — not raw copy count, so a 4-of doesn't outweigh being a staple across many decks. */
  deckCount: number;
  totalCopies: number;
}

/** Card usage broken out by deck section — main/material/sideboard are structurally different (e.g. a card that's a defining material-deck piece would otherwise get lost among 40-card mainboard staples). */
export interface TopCardsBySection {
  main: PlayerTopCard[];
  material: PlayerTopCard[];
  sideboard: PlayerTopCard[];
}

export interface PlayerDeckProfile {
  playerId: number;
  totalDecks: number;
  topChampions: PlayerTopChampion[];
  topCards: TopCardsBySection;
}

export interface PlayerDecksData {
  generatedAt: string;
  players: PlayerDeckProfile[];
}

/** One head-to-head record against a single opponent. `winRate` counts a tie as half a win, same convention as everywhere else win rate is computed. */
// (rivals.ts, still part of the "Player profiles" group above)
export interface PlayerRival {
  opponentId: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
}

/**
 * A player's most-played opponents ("rivals") — the top N by games played against them, then
 * sorted by win rate ascending (worst matchups first) rather than by games played, since "who do
 * they struggle against most" is the more interesting framing than raw pairing frequency.
 */
export interface PlayerRivalsProfile {
  playerId: number;
  rivals: PlayerRival[];
}

export interface RivalsData {
  generatedAt: string;
  players: PlayerRivalsProfile[];
}

// ---------------------------------------------------------------------------
// Deck sightings (pipeline/src/analysis/deckSightings.ts) — one record per
// public decklist, plus the lean DeckPopularityEntry projection of it.
// ---------------------------------------------------------------------------

/**
 * One lean record per public decklist ("sighting") — the full decklist itself isn't included
 * here, it stays in the already-published per-event bundle (data/omnidex/events/{id}.json);
 * this dataset only carries what's needed to filter/sort/browse across every sighted deck.
 * `winner`/`topCut`/`high` are outcome flags adapted independently from Fractal of Insight's
 * "which decks did well" concept (not their code/data, per the Phase 13 licensing note): winner
 * = placement 1, topCut = placement within the event's single-elimination cut size, high = match
 * win rate >= 50%.
 */
export interface DeckSighting {
  deckId: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventCategory: string;
  seasonId: number | null;
  seasonName: string | null;
  format: string;
  player: number;
  championName: string | null;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
  /** Match win rate, ties counted as half a win — Omnidex only exposes match-level records, not per-game. */
  winRate: number;
  winner: boolean;
  topCut: boolean;
  high: boolean;
  /**
   * Count of OTHER decks (submitted by a different player) with an identical main+material card
   * list — signals netdecking rather than independent brewing. Same-player reuse across events
   * doesn't count.
   */
  duplicateCount: number;
  /**
   * `shortHash` of this sighting's main+material signature, matching a Popular Decks entry's
   * `/decks/:hash` page — only set when duplicateCount > 0 (i.e. at least one other player ran
   * the exact same list), the same threshold `useDeckPopularity` uses client-side to decide a
   * build is "popular" enough for its own page. Null for decks unique to one player, which have
   * no dedicated page to link to.
   */
  deckHash: string | null;
  /** placement / event player count — e.g. 0.02 = top 2%. Null when placement or player count is unavailable. Scales correctly across events of any size, unlike a bare placement number. */
  placementPercentile: number | null;
  /** Event-tier prestige weight (see EVENT_CATEGORY_WEIGHTS) — an Ascent counts for more than a Regular. */
  eventTierWeight: number;
  /** `eventTierWeight * (1 - placementPercentile)`, or 0 when percentile is unavailable — the single sortable "how good was this finish" number, comparable across events of any size or tier. */
  weightedScore: number;
  /**
   * A strong match record (winRate >= 0.6, at least 3 wins) that still finished outside the top
   * 30% of the field — Swiss tiebreakers (opponents' win %) can badly punish a good record against
   * a weak schedule, so this isn't a data error, just bad luck. Threshold chosen against the real
   * dataset: ~4% of sightings qualify, including several literal 3-0/4-0 records that still landed
   * in the bottom half. Requires a known placementPercentile.
   */
  underplaced: boolean;
  /** Ability keywords present in this deck's main+material, weighted by copies — see `computeKeywordComposition` in `keywords.ts`. Only present (non-zero) keywords are listed. */
  keywords: DeckSightingKeyword[];
  /** Sum of known main+material card prices — see `computeDeckPrice` in `deckPricing.ts`. Null when none of this deck's cards have a known price, not $0. */
  price: number | null;
}

export interface DeckSightingKeyword {
  keyword: string;
  count: number;
}

export interface DeckSightingsData {
  generatedAt: string;
  sightings: DeckSighting[];
}

/**
 * A lean projection of DeckSighting — only the fields `useDeckPopularity.ts` needs to group and
 * rank decks (championName, per-sighting outcome, event context), plus the small scalar fields
 * (wins/losses/ties/underplaced) that let `TopDecksList`'s handful of "played by" consumers
 * (Archetype/Deck/Card/Champion detail, Popular Decks' expanded row) migrate off the full dataset
 * too — everything TopDecksList needs except eventName, which those pages join client-side from
 * the already-widely-loaded Omnidex index by eventId instead of duplicating a ~31-char string
 * per entry here. Exists because `deck-sightings.json` grew to 40MB+ (every sighting's full
 * keyword breakdown, price, repeated event/season name strings, etc.), and these consumers need
 * the whole file just for a handful of small fields per sighting — a real mobile-crash cause (see
 * git history around the fix). This file is a fraction of the size for the exact same population.
 */
export interface DeckPopularityEntry {
  deckId: string;
  championName: string | null;
  player: number;
  eventId: number;
  eventDate: string;
  placement: number | null;
  winRate: number;
  weightedScore: number;
  wins: number;
  losses: number;
  ties: number;
  underplaced: boolean;
  /**
   * Same value as this sighting's `DeckSighting.deckHash` — carried onto the lean index too so a
   * deck page (`/decks/:hash`) can resolve its one target deck by a cheap filter over this
   * already-loaded dataset, instead of decoding and grouping the full deck-card-index universe
   * (or worse, loading deck-sightings.json, 40MB+, just to read this field) — see DeckDetail.tsx's
   * `matchingSightings` fast path. Optional on older cached copies published before this field
   * existed; `usePublishedData`'s `generatedAt` check republishes once the pipeline catches up, so
   * this is a temporary, self-healing gap, not a permanent optional field.
   */
  deckHash?: string | null;
}

export interface DeckPopularityIndexData {
  generatedAt: string;
  entries: DeckPopularityEntry[];
}

// ---------------------------------------------------------------------------
// Meta-wide keyword / quantity / composition win-rate stats
// (pipeline/src/analysis/keywordStats.ts, cardQuantityStats.ts, deckCompositionStats.ts)
// — same accumulate-bucket-shrink shape as CardStat above, keyed differently.
// ---------------------------------------------------------------------------

export interface KeywordStat {
  keyword: string;
  deckCount: number;
  eventCount: number;
  avgWinRate: number;
  /** avgWinRate shrunk toward 50% proportional to sample size — same convention as CardStat.adjustedWinRate. */
  adjustedWinRate: number;
}

export interface KeywordStatsData {
  generatedAt: string;
  keywords: KeywordStat[];
}

export interface CardQuantityBucket {
  quantity: number;
  deckCount: number;
  avgWinRate: number;
  /** avgWinRate shrunk toward 50% proportional to sample size — same convention as CardStat.adjustedWinRate. */
  adjustedWinRate: number;
}

/** A card's win rate broken out by how many copies a deck ran it at — only published for cards run at 2+ distinct quantities across public decklists (nothing to compare otherwise). */
export interface CardQuantityStat {
  name: string;
  slug: string | null;
  /** Sorted ascending by quantity. */
  quantities: CardQuantityBucket[];
}

export interface CardQuantityStatsData {
  generatedAt: string;
  cards: CardQuantityStat[];
}

/** One main-deck card type (Ally, Action, Attack, ...) at one 10-percentage-point share-of-deck bucket (e.g. "20-30%"), and the average win rate among decks whose main deck fell in that bucket for that type — weighted by copies, main deck only (material/sideboard excluded; this is a "how much of your gameplan is X" question, not a full decklist tally). */
export interface CompositionWinRateStat {
  type: string;
  bucket: string;
  deckCount: number;
  avgWinRate: number;
  adjustedWinRate: number;
}

export interface CompositionWinRateData {
  generatedAt: string;
  stats: CompositionWinRateStat[];
}

// ---------------------------------------------------------------------------
// Champion season trends (pipeline/src/analysis/championTrends.ts)
// ---------------------------------------------------------------------------

export interface ChampionSeasonPerformance {
  seasonId: number;
  seasonName: string;
  deckCount: number;
  eventCount: number;
  winCount: number;
  topCutCount: number;
  avgWinRate: number;
  /** Sum of `DeckSighting.weightedScore` across this champion's sightings in this season. */
  totalWeightedScore: number;
  /**
   * This champion's `totalWeightedScore` as a fraction of every champion's combined
   * `totalWeightedScore` that season — the metric trends are actually computed from, since raw
   * score totals aren't comparable across seasons (sample size grew a lot as backfill coverage
   * improved: 2,488 sightings in the earliest season vs. 11,808 in the most recent).
   */
  shareOfSeason: number;
}

export type ChampionTrendDirection = "rising" | "falling" | "stable" | "new" | "absent" | "insufficient-data";

export interface ChampionTrend {
  championName: string;
  /** Chronological order (oldest first), one entry per season in the dataset — 0-valued fields for seasons the champion had no sightings in. */
  seasons: ChampionSeasonPerformance[];
  /** Comparing `shareOfSeason` between the two most recent seasons in the dataset, not just this champion's own most recent appearances — so going quiet for a season shows up as "falling"/"absent" rather than being skipped. */
  trend: ChampionTrendDirection;
  /** Percentage-point change in `shareOfSeason` between the two most recent seasons (signed). Null when `trend` is "insufficient-data". */
  trendDeltaPct: number | null;
}

export interface ChampionTrendsData {
  generatedAt: string;
  /** Season names in chronological order (oldest first) — the same order used within each `ChampionTrend.seasons`. */
  seasonOrder: string[];
  champions: ChampionTrend[];
}

// ---------------------------------------------------------------------------
// Deck card index (pipeline/src/analysis/deckCardIndex.ts)
// ---------------------------------------------------------------------------

export interface DeckCardIndexLine {
  name: string;
  quantity: number;
}

/** `[cardNameIndex, quantity]` — the index refers into `DeckCardIndexData.cardNames`. See `decodeCardLines`. */
export type EncodedCardLine = [number, number];

/**
 * One entry per public decklist, giving its full card contents by section — the raw material
 * behind the "which cards are used together" filter (browse decks containing one or more chosen
 * cards, see what else shows up alongside them). Presence-matching considers all three sections;
 * event/player context isn't included here since that already lives in DeckSightingsData
 * (joinable by `deckId`) and this dataset is deliberately just the card-membership surface.
 *
 * Card names are dictionary-encoded (see `DeckCardIndexData.cardNames`) rather than repeated per
 * line — this dataset has ~57k decks averaging ~45 unique card names each, so spelling out
 * `{"name":"...","quantity":N}` per line meant repeating the same ~2,500 card names millions of
 * times (93MB raw for one real run). `[index, quantity]` tuples against a shared dictionary cut
 * that dramatically; see `decodeCardLines` to get back the `{name, quantity}` shape callers want.
 */
export interface DeckCardIndexEntry {
  deckId: string;
  main: EncodedCardLine[];
  material: EncodedCardLine[];
  sideboard: EncodedCardLine[];
}

export interface DeckCardIndexData {
  generatedAt: string;
  /** Dictionary of every card name referenced anywhere in `decks`, indexed by position — see `DeckCardIndexEntry`. */
  cardNames: string[];
  decks: DeckCardIndexEntry[];
}

/** Resolves `[cardNameIndex, quantity]` tuples back to `{name, quantity}` against a `DeckCardIndexData.cardNames` dictionary. */
export function decodeCardLines(lines: EncodedCardLine[], cardNames: string[]): DeckCardIndexLine[] {
  return lines.map(([nameIndex, quantity]) => ({ name: cardNames[nameIndex], quantity }));
}

// ---------------------------------------------------------------------------
// Archetype taxonomy — data-derived named "builds" (clusters), distinct from
// the coarser ArchetypeSummary/ArchetypeData near the top of this file.
// (pipeline/src/analysis/archetypeTaxonomy.ts)
// ---------------------------------------------------------------------------

/**
 * A data-derived named "build" within a single Champion — e.g. "Water Guo Jia" — distinct from
 * `ArchetypeSummary` (the older, coarser class+element/Champion rollup that `archetypes.json`
 * still publishes for the Battle Chart). Clusters are found by grouping exact main+material
 * strategy signatures (excluding Champion and Spirit printings) and greedily merging similar
 * groups; see `pipeline/src/analysis/archetypeTaxonomy.ts`
 * and docs/CALCULATIONS.md for the full method and why it was chosen over simpler alternatives.
 */
export interface ArchetypeCluster {
  /** Hash of the cluster's deterministic representative exact strategy signature; independent of plurality-Champion and defining-card threshold changes. */
  id: string;
  /** The plurality Champion (most players) among this cluster's decks — see `championBreakdown` for the full split. Clustering itself is card-only and cross-Champion, so a cluster can (and often does) span more than one Champion. */
  championName: string;
  /** Every Champion this cluster's decks were actually played under, sorted by playerCount descending. Length 1 for a single-Champion build; length >1 means the same card shell got netdecked under more than one Champion. */
  championBreakdown: { championName: string; deckCount: number; playerCount: number }[];
  /** Uses Element + Champion when one Champion has at least 60% of sightings; otherwise uses an Element + defining-card shell name. */
  name: string;
  deckCount: number;
  playerCount: number;
  eventCount: number;
  /** Established clusters have at least the configured independent-player floor across at least 2 events; smaller published clusters are emerging signals. */
  confidence: "established" | "emerging";
  avgWinRate: number;
  /** 95% Wilson interval over the cluster's recorded match outcomes; ties count as half a win. */
  winRateInterval: { low: number; high: number; matches: number };
  /** Similarity to this cluster's seed and margin over the nearest alternative, weighted by deck sightings. */
  quality: { meanSimilarity: number; minSimilarity: number; meanAssignmentMargin: number };
  /** Cards present in most of this cluster's deck sightings but not most deck sightings generally — what actually distinguishes this build. Sorted by prevalence descending. */
  definingCards: { name: string; prevalence: number }[];
  /** Main-deck-only defining cards used to assign this build to a broader strategy archetype. */
  mainDefiningCards: { name: string; prevalence: number }[];
  /** Material cards common to this exact build path. Includes Champion/Spirit identity cards. */
  materialDefiningCards: { name: string; prevalence: number }[];
  /** Average copies per sighting for every main-deck card in this cluster. Used to explain clustering and compare builds without downloading the full deck-card index. */
  mainDeckAverageCards: { name: string; quantity: number }[];
  /** Average copies per sighting for every material-deck card in this cluster. */
  materialDeckAverageCards: { name: string; quantity: number }[];
  /** Parent material progression shared across Spirits (for example, Lorraine, Crux Knight). */
  materialArchetypeId: string;
  /** Parent strategy archetype derived from shared main-deck engines/win conditions. */
  strategyArchetypeId: string;
  /** Every member deck's id, joinable against DeckSightingsData — same pattern as PopularDeck.deckIds. */
  deckIds: string[];
  /** Only the seasons this build actually has sightings in (not zero-padded across every season) — for season filtering, not trend analysis. */
  seasons: ArchetypeClusterSeasonStats[];
  /** Comparing this build's own two most recent seasons with data (not necessarily calendar-adjacent, if it skipped a season) — null when it's only been seen in one season, so there's nothing to compare. */
  trend: ArchetypeClusterTrend | null;
  /** deckCount / (sum of every cluster's deckCount) — scoped to the clustered population, not every sighting, since one-off unclustered brews were never eligible for a "share" of a named-build breakdown. */
  metaShare: number;
  /** Count / fraction of this cluster's sightings that made their event's single-elimination cut (whatever size that event used — see `DeckSighting.topCut`). */
  topCutCount: number;
  topCutRate: number;
  /** Mean placement among sightings with a known placement; null when none of this cluster's sightings have one. */
  avgPlacement: number | null;
  /** Main+material price stats across this cluster's distinct builds, weighted by sighting count; null when no member deck has any priced cards. */
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}

/** Main-deck centroid similarity required for the conservative near-duplicate build repair pass. */
export const ARCHETYPE_NEAR_DUPLICATE_THRESHOLD = 0.85;

/** A Champion progression/material route above Spirit variants and concrete main-deck builds. */
export interface MaterialArchetype {
  id: string;
  /** Human-readable route name, normally the highest-level Champion printing. */
  name: string;
  championName: string;
  buildIds: string[];
  deckIds: string[];
  /** Spirits observed inside this route, aggregated independently of exact build clustering. */
  spiritBreakdown: { name: string; deckCount: number; playerCount: number }[];
  definingCards: { name: string; prevalence: number }[];
  deckCount: number;
  playerCount: number;
  eventCount: number;
  avgWinRate: number;
  confidence: "established" | "emerging";
}

/** A strategy family above one or more concrete build clusters. */
export interface StrategyArchetype {
  id: string;
  name: string;
  championName: string;
  buildIds: string[];
  /** Main-deck package shared by the member builds, weighted by their deck sightings. */
  definingCards: { name: string; prevalence: number }[];
  deckCount: number;
  playerCount: number;
  eventCount: number;
  avgWinRate: number;
  confidence: "established" | "emerging";
}

export interface ArchetypeClusterSeasonStats {
  seasonId: number;
  seasonName: string;
  deckCount: number;
  playerCount: number;
  eventCount: number;
  avgWinRate: number;
}

export interface ArchetypeClusterTrend {
  previousSeasonName: string;
  latestSeasonName: string;
  /** latest.playerCount - previous.playerCount. Raw counts, not normalized for backfill coverage growing season to season — see docs/CALCULATIONS.md. */
  playerCountChange: number;
  /** (latest.avgWinRate - previous.avgWinRate) * 100, signed percentage points. */
  winRateChangePct: number;
}

export interface ArchetypeTaxonomyData {
  generatedAt: string;
  clusters: ArchetypeCluster[];
  /** Material progression families; these deliberately merge across Spirit choices. */
  materialArchetypes: MaterialArchetype[];
  /** Package-level strategy families; `clusters` remain the concrete builds within them. */
  strategyArchetypes: StrategyArchetype[];
  /** Coverage of all visible deck sightings by a published cluster, including attached singleton variants. */
  coverage: { classifiedDeckCount: number; totalDeckCount: number; classificationRate: number };
  /** Retired archetype id -> current id, preserving previously shared archetype URLs across rebuilds. */
  aliases: Record<string, string>;
  /** Card name -> every cluster it's a defining card of (with that cluster's prevalence for this card), for resolving "which archetypes is this card part of" on a card's own page. Same shape/purpose as `CardImpactData.deckClusterIndex`, just card-keyed and to multiple clusters instead of deck-keyed to one. Only cards that are a defining card of at least one cluster are present. */
  cardClusterIndex: Record<string, { clusterId: string; prevalence: number }[]>;
}

export interface ArchetypeGoldSetCheck {
  label: string;
  champion: string;
  requiredCards: string[];
  passed: boolean;
  clusterId: string | null;
  clusterName: string | null;
  /** Lowest prevalence of any required strategy card inside the matched cluster. */
  packagePrevalence: number;
  /** Highest equivalent prevalence among every competing cluster. */
  nearestRivalPrevalence: number;
  /** packagePrevalence - nearestRivalPrevalence; positive values mean the package identifies this shell. */
  separation: number;
}

export interface ArchetypeThresholdValidation {
  threshold: number;
  clusterCount: number;
  establishedCount: number;
  classificationRate: number;
  medianMeanSimilarity: number;
  medianAssignmentMargin: number;
  assignmentAgreementWithBaseline: number;
  goldSet: ArchetypeGoldSetCheck[];
}

/** Sensitivity and temporal-stability report produced by archetypeTaxonomyValidation.ts. */
export interface ArchetypeTaxonomyValidationData {
  generatedAt: string;
  baselineThreshold: number;
  temporalHoldout: {
    cutoff: string;
    historicalDeckCount: number;
    historicalClusterCount: number;
    assignmentAgreementWithFull: number;
  };
  thresholds: ArchetypeThresholdValidation[];
}

// ---------------------------------------------------------------------------
// Package candidates — rules-text-nominated card relationships, scored against
// real deck co-occurrence (pipeline/src/analysis/packageCandidates.ts,
// shared/src/packageConfidence.ts, shared/src/packageSeeds.ts)
// ---------------------------------------------------------------------------

export interface ArchetypePackageSource {
  buildId: string;
  buildName: string;
  prevalence: number;
  sectionPattern: "Main → Main" | "Main → Material" | "Material → Material";
}

export interface PackageCandidateSeed {
  anchorCard: string;
  memberCards: string[];
  evidenceKinds: string[];
  anchorIsChampion?: boolean;
  archetypeSources?: ArchetypePackageSource[];
}

export type ConfidenceTier = "strong" | "limited" | "exploratory" | "textOnly";

/** Common shape for a scored anchor/member relationship, shared between the pipeline's
 * site-wide mining (`PackageCandidateEvidence`) and the client's per-deck live detector. */
export interface TieredPackageMatch {
  anchorCard: string;
  memberCards: string[];
  evidenceKinds: string[];
  confidenceTier: ConfidenceTier;
  /** Null only when `confidenceTier` is `"textOnly"` — no confirming deck exists (or presence data hasn't loaded yet). */
  confidence: number | null;
  lift: number | null;
  matchingDecks: number;
  populationDecks: number;
}

export interface PackageCandidateEvidence extends TieredPackageMatch {
  anchorDecks: number;
  memberDecks: number;
  support: number;
  championCoverage: number;
  strongestChampions: { championName: string; matchingDecks: number; confidence: number; lift: number }[];
  archetypeSources?: ArchetypePackageSource[];
  confidenceScore: number;
  cautions: string[];
}

export interface PackageCandidateFamily {
  anchorCard: string;
  coreCards: string[];
  optionCards: string[];
  minOptions: number;
  evidenceKinds: string[];
  candidateCount: number;
  confidenceScore: number;
  matchingDecks: number;
}

export interface PackageCandidatesData {
  generatedAt: string;
  candidates: PackageCandidateEvidence[];
  families: PackageCandidateFamily[];
}

// ---------------------------------------------------------------------------
// Card Impact — general and matchup-scoped
// (pipeline/src/analysis/cardImpact.ts, matchupCardImpact.ts)
// ---------------------------------------------------------------------------

/** How a card is typically played within a build — which section(s) of the deck its "with" sightings actually came from. */
export type CardImpactRole = "main" | "material" | "sideboard" | "mixed";

export interface CardImpactEntry {
  cardName: string;
  role: CardImpactRole;
  deckCountWith: number;
  deckCountWithout: number;
  avgWinRateWith: number;
  avgWinRateWithout: number;
  /** Each side's avg win rate shrunk toward the cluster's own avgWinRate (not a flat 50%), then differenced — see docs/CALCULATIONS.md. The single sortable "does this card actually help" number. Correlational, not causal. */
  adjustedLift: number;
}

export interface ClusterCardImpact {
  clusterId: string;
  championName: string;
  clusterName: string;
  totalDecks: number;
  baselineWinRate: number;
  /** Sorted by adjustedLift descending, capped to a generous top-N — see docs/CALCULATIONS.md. */
  cards: CardImpactEntry[];
}

export interface CardImpactData {
  generatedAt: string;
  clusters: ClusterCardImpact[];
  /** deckId -> clusterId, for resolving which cluster (if any) a viewed decklist elsewhere in the app belongs to. Only decks that belong to some cluster are present. */
  deckClusterIndex: Record<string, string>;
}

/**
 * Card Impact scoped to one specific opponent named build, from real pairing outcomes (not
 * event-aggregate win rate) — answers "does my card help against THIS matchup" (myCards) and,
 * inverted, "does the opponent's card hurt me against THIS matchup" (opponentCards). Named-build-
 * vs-named-build is a small population by construction (see docs/CALCULATIONS.md for the sample
 * size reality check), so `games`/`baselineWinRate` are always present even when there's too
 * little data to break a matchup down card-by-card — `myCards`/`opponentCards` are simply empty
 * in that case rather than the matchup being omitted outright.
 */
/**
 * One of my own cards that correlates with blunting a specific opponent card's sting — restricted
 * to games where the opponent had that card, split by whether I also had this one. `scope`
 * records which population produced the number: `"cluster"` (the precise named-build-vs-named-
 * build pool, same as `myCards`/`opponentCards`) when it had enough games to clear the sample bar
 * on its own, else `"champion"` (my whole Champion vs. their whole Champion, not gated by cluster
 * membership — much bigger, less precise) as a fallback. The UI should disclaim `"champion"`
 * entries as broader/less precise.
 */
export interface AnswerCardEntry {
  cardName: string;
  role: CardImpactRole;
  /** Shrunk win-rate-with-my-card minus shrunk win-rate-without, both restricted to games where the opponent had the card being answered. */
  mitigation: number;
  sampleWithAnswer: number;
  sampleWithoutAnswer: number;
  scope: "cluster" | "champion";
}

export interface OpponentCardAnswers {
  /** Matches a `cardName` in this matchup's `opponentCards`. */
  opponentCardName: string;
  /** Top candidates by mitigation descending. */
  answers: AnswerCardEntry[];
}

export interface ClusterMatchupImpact {
  clusterId: string;
  opponentClusterId: string;
  opponentClusterName: string;
  opponentChampionName: string;
  games: number;
  /** This cluster's win rate specifically in games played against opponentClusterId (ties count as 0.5). */
  baselineWinRate: number;
  /** My cards that correlate with beating this matchup more, sorted by adjustedLift descending. */
  myCards: CardImpactEntry[];
  /** The opponent's cards — role is their role in the OPPONENT's deck — sorted by adjustedLift ascending (most negative, i.e. worst for me, first). */
  opponentCards: CardImpactEntry[];
  /** For opponentCards with a qualifying answer at either scope — see AnswerCardEntry. Only entries with >=1 answer are present. */
  answers: OpponentCardAnswers[];
}

export interface MatchupCardImpactData {
  generatedAt: string;
  matchups: ClusterMatchupImpact[];
}

// ---------------------------------------------------------------------------
// Achievements (pipeline/src/analysis/achievements.ts)
// ---------------------------------------------------------------------------

export type AchievementCategory = "tournament" | "rating" | "playstyle" | "dedication" | "judging";

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = ["tournament", "rating", "playstyle", "dedication", "judging"];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  tournament: "Tournament Wins",
  rating: "Rating",
  playstyle: "Playstyle",
  dedication: "Dedication",
  judging: "Judging",
};

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
}

/**
 * One player earning one achievement. `earnedAt` is the date of the qualifying event where
 * possible; for milestone-style achievements (a rating threshold, a judge level) that aren't tied
 * to one specific event, it's the most recent event date on record at the time the threshold was
 * met — a reasonable proxy, not necessarily the exact date the threshold was first crossed.
 */
export interface AchievementUnlock {
  achievementId: string;
  playerId: number;
  earnedAt: string;
  /** Human-readable specifics, e.g. the event name, rating reached, or a count — shown alongside the badge. */
  context: string;
  /** The event most directly tied to this unlock, if any — lets the UI link to `/events/{eventId}`. */
  eventId?: number;
  /** The specific decklist tied to this unlock, if any (`${eventId}:${player}`, same convention as `DeckSighting.deckId`) — lets the UI open it in the Compare tool. */
  deckId?: string;
  /** For achievements tied to a specific match against another player (currently just Giant Slayer) — lets the UI open both sides' decks from that event in the Compare tool. */
  opponentPlayerId?: number;
}

export interface AchievementsData {
  generatedAt: string;
  definitions: AchievementDefinition[];
  unlocks: AchievementUnlock[];
}
