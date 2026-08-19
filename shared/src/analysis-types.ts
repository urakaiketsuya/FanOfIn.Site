/** Published by the pipeline's analysis engines (data/analysis/*.json). */

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
}

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

/**
 * A data-derived named "build" within a single Champion — e.g. "Water Guo Jia" — distinct from
 * `ArchetypeSummary` (the older, coarser class+element/Champion rollup that `archetypes.json`
 * still publishes for the Battle Chart). Clusters are found by grouping exact main+material
 * decklists and greedily merging similar groups; see `pipeline/src/analysis/archetypeTaxonomy.ts`
 * and docs/CALCULATIONS.md for the full method and why it was chosen over simpler alternatives.
 */
export interface ArchetypeCluster {
  /** Stable across regenerations as long as the defining cards don't change — djb2 hash of championName + sorted defining card names, same scheme as `shortHash`. */
  id: string;
  championName: string;
  /** e.g. "Water Guo Jia", or "Fire Guo Jia (Vermilion Decree)" when a second cluster shares the dominant element. */
  name: string;
  deckCount: number;
  playerCount: number;
  eventCount: number;
  avgWinRate: number;
  /** Cards present in most of this cluster's decks but not most of the Champion's other decks — what actually distinguishes this build. Sorted by prevalence descending. */
  definingCards: { name: string; prevalence: number }[];
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
}

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
