/** Published shapes for pipeline/src/shoutatyourdecks/analytics/ — see docs/CALCULATIONS.md, "ShoutAtYourDecks analytics". */

import type { ShoutAtYourDecksDeckSummary } from "./shoutatyourdecks-types.js";
import type { DeckFormat } from "./shoutatyourdecks-types.js";

export interface CommunityFormatSummaryData {
  generatedAt: string;
  counts: Record<DeckFormat, number>;
  confirmedCounts: Record<DeckFormat, number>;
  inferredCounts: Record<DeckFormat, number>;
}

export interface CardInclusionEntry {
  name: string;
  resolved: boolean;
  deckCount: number;
  percentOfDecks: number;
  totalCopies: number;
  avgCopiesWhenIncluded: number;
  /** Whichever section (main/material/sideboard) accounts for >=80% of this card's appearances, "mixed" otherwise — same convention as CardImpactRole (shared/src/cardImpact.ts). Lets a community-derived build suggestion (see "Community population" in docs/CALCULATIONS.md) know which section to place a card in. */
  primarySection: "main" | "material" | "sideboard" | "mixed";
}

export interface CardInclusionData {
  generatedAt: string;
  decksConsidered: number;
  overall: CardInclusionEntry[];
  byChampion: Record<string, { deckCount: number; cards: CardInclusionEntry[] }>;
}

export interface PopularityBucket {
  key: string;
  deckCount: number;
  percentOfDecks: number;
}

export interface PopularityData {
  generatedAt: string;
  championDecksConsidered: number;
  champion: PopularityBucket[];
  elementDecksConsidered: number;
  element: PopularityBucket[];
}

export interface PriceStats {
  count: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
}

export interface PriceDistributionData {
  generatedAt: string;
  decksConsidered: number;
  overall: PriceStats | null;
  byChampion: Record<string, PriceStats>;
}

export interface ShoutAtYourDecksArchetypeCluster {
  champion: string;
  size: number;
  signature: string;
  representative: { title: string; url: string };
  materialDeck: { name: string; quantity: number }[];
  mainDeck: { name: string; quantity: number }[];
  definingCards?: string[];
  championBreakdown?: { champion: string; deckCount: number }[];
}

export interface ShoutAtYourDecksArchetypeClusteringData {
  generatedAt: string;
  decksConsidered: number;
  clusters: ShoutAtYourDecksArchetypeCluster[];
}

export interface DeckEraBucket {
  setPrefix: string;
  earliestDate: string;
  deckCount: number;
  percentOfDecks: number;
}

export interface DeckEraData {
  generatedAt: string;
  decksConsidered: number;
  unresolvedDeckCount: number;
  buckets: DeckEraBucket[];
}

export interface CommunityCoOccurrenceEntry {
  cardName: string;
  /** Decks (within this champion's population) containing both the key card and this buddy. */
  count: number;
  /** count / (decks containing the key card) — same field name/meaning as app/src/features/deckbuilder/useBuddyCards.ts's client-side BuddyCard, so the two lenses read identically even though one is pipeline-computed and one is client-computed. */
  coOccurrenceRate: number;
}

/**
 * Per champion, per card, its top co-occurring other cards in the same deck (main+material) —
 * pure presence-based co-occurrence, deliberately unranked by win rate (there isn't any). See
 * docs/CALCULATIONS.md, "ShoutAtYourDecks analytics" — this mirrors useBuddyCards.ts's own
 * MIN_SUPPORT/top-5 gating so the two "played together" lenses (tournament, community) read
 * consistently even though this one is computed pipeline-side over the full ShoutAtYourDecks
 * population instead of client-side over just the currently-locked cards.
 */
export interface CommunityCoOccurrenceData {
  generatedAt: string;
  decksConsidered: number;
  byChampion: Record<string, Record<string, CommunityCoOccurrenceEntry[]>>;
}

/**
 * Per card, a capped list of real ShoutAtYourDecks decks that include it — for linking out to the
 * actual deck page (`ShoutAtYourDecksDeckSummary.url`), not an aggregate stat. See
 * docs/CALCULATIONS.md, "ShoutAtYourDecks analytics" — deliberately unordered, since ShoutAtYourDecks
 * doesn't record when a deck was actually built or updated (only when this site's scraper fetched
 * it), so there's no honest basis to call any subset "most recent."
 */
export interface CardDeckReferencesData {
  generatedAt: string;
  decksConsidered: number;
  byCardName: Record<string, ShoutAtYourDecksDeckSummary[]>;
}
