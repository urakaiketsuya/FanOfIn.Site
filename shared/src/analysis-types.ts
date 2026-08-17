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
}

export interface DeckSightingsData {
  generatedAt: string;
  sightings: DeckSighting[];
}

export interface DeckCardIndexLine {
  name: string;
  quantity: number;
}

/**
 * One entry per public decklist, giving its full card contents by section — the raw material
 * behind the "which cards are used together" filter (browse decks containing one or more chosen
 * cards, see what else shows up alongside them). Presence-matching considers all three sections;
 * event/player context isn't included here since that already lives in DeckSightingsData
 * (joinable by `deckId`) and this dataset is deliberately just the card-membership surface.
 */
export interface DeckCardIndexEntry {
  deckId: string;
  main: DeckCardIndexLine[];
  material: DeckCardIndexLine[];
  sideboard: DeckCardIndexLine[];
}

export interface DeckCardIndexData {
  generatedAt: string;
  decks: DeckCardIndexEntry[];
}
