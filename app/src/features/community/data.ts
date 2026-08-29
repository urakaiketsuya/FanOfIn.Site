import type {
  CardDeckReferencesData,
  CardInclusionData,
  CommunityCoOccurrenceData,
  CommunitySourceCounts,
  DeckEraData,
  PopularityData,
  PriceDistributionData,
  ShoutAtYourDecksArchetypeClusteringData,
  CommunityFormatSummaryData,
  DeckFormat,
  ShoutAtYourDecksDeckSummary,
} from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

/** Standalone ShoutAtYourDecks-derived stats — deliberately separate from every Omnidex-derived hook elsewhere in this app (see docs/CALCULATIONS.md, "ShoutAtYourDecks analytics"). */
function formatPath(format: DeckFormat, file: string): string {
  return `/data/shoutatyourdecks/analytics/${format === "PANTHEON" ? "pantheon/" : ""}${file}.json`;
}

/** Blended ShoutAtYourDecks + Sleeved community population — see pipeline/src/community/blend.ts
 * and docs/CALCULATIONS.md, "Community population (blended)". Every site-facing community stat
 * (Community usage badges, Card Stats "Hype gap", Guided Deck Builder's Community population) reads
 * from here rather than `formatPath` above, which stays ShoutAtYourDecks-only. Pair with
 * `useCommunitySourceCounts` to disclose the per-source split rather than presenting this as
 * single-sourced. */
function blendedPath(format: DeckFormat, file: string): string {
  return `/data/community/${format === "PANTHEON" ? "pantheon/" : ""}${file}.json`;
}

export function useCommunityBlendedCardInclusion(format: DeckFormat = "STANDARD") {
  return usePublishedData<CardInclusionData>(`community-blended-card-inclusion-${format}`, blendedPath(format, "card-inclusion"));
}

export function useCommunityBlendedCoOccurrence(format: DeckFormat = "STANDARD") {
  return usePublishedData<CommunityCoOccurrenceData>(`community-blended-co-occurrence-${format}`, blendedPath(format, "co-occurrence"));
}

export function useCommunityBlendedDeckReferences() {
  return usePublishedData<CardDeckReferencesData>("community-blended-deck-references", "/data/community/deck-references.json");
}

export function useCommunitySourceCounts() {
  return usePublishedData<CommunitySourceCounts>("community-source-counts", "/data/community/sources.json");
}

export function useCommunityCardInclusion(format: DeckFormat = "STANDARD") {
  return usePublishedData<CardInclusionData>(`shoutatyourdecks-card-inclusion-${format}`, formatPath(format, "card-inclusion"));
}

export function useCommunityCoOccurrence(format: DeckFormat = "STANDARD") {
  return usePublishedData<CommunityCoOccurrenceData>(`shoutatyourdecks-co-occurrence-${format}`, formatPath(format, "co-occurrence"));
}

export function useCommunityPopularity(format: DeckFormat = "STANDARD") {
  return usePublishedData<PopularityData>(`shoutatyourdecks-popularity-${format}`, formatPath(format, "popularity"));
}

export function useCommunityPriceDistribution(format: DeckFormat = "STANDARD") {
  return usePublishedData<PriceDistributionData>(
    `shoutatyourdecks-price-distribution-${format}`,
    formatPath(format, "price-distribution"),
  );
}

export function useCommunityArchetypes(format: DeckFormat = "STANDARD") {
  return usePublishedData<ShoutAtYourDecksArchetypeClusteringData>(
    `shoutatyourdecks-archetypes-${format}`,
    formatPath(format, "archetypes"),
  );
}

export function useCommunityDeckEra(format: DeckFormat = "STANDARD") {
  return usePublishedData<DeckEraData>(`shoutatyourdecks-deck-era-${format}`, formatPath(format, "deck-era"));
}

export function useCommunityFormatSummary() {
  return usePublishedData<CommunityFormatSummaryData>("shoutatyourdecks-format-summary", "/data/shoutatyourdecks/analytics/format-summary.json");
}

export function useCommunityDeckIndex() {
  // The root index remains available between community analytics rebuilds; Pantheon browsing
  // filters its classified records locally and therefore does not disappear during a partial run.
  return usePublishedData<{ generatedAt: string; decks: ShoutAtYourDecksDeckSummary[] }>("shoutatyourdecks-index", "/data/shoutatyourdecks/index.json");
}

export function usePantheonDeckIndex() {
  return usePublishedData<{ generatedAt: string; decks: ShoutAtYourDecksDeckSummary[] }>("shoutatyourdecks-pantheon-decks", "/data/shoutatyourdecks/analytics/pantheon/decks.json");
}

/** "Diao Chan" -> "diao-chan" — the inverse of CommunityDecksIndex.tsx's formatChampionName. Every real champion name today is plain ASCII words (confirmed against the real byChampion keys), so a simple lowercase+hyphenate is sufficient. */
export function championToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
