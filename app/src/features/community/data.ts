import type {
  CardDeckReferencesData,
  CardInclusionData,
  CommunityCoOccurrenceData,
  DeckEraData,
  PopularityData,
  PriceDistributionData,
  ShoutAtYourDecksArchetypeClusteringData,
} from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

/** Standalone ShoutAtYourDecks-derived stats — deliberately separate from every Omnidex-derived hook elsewhere in this app (see docs/CALCULATIONS.md, "ShoutAtYourDecks analytics"). */
export function useCommunityCardInclusion() {
  return usePublishedData<CardInclusionData>("shoutatyourdecks-card-inclusion", "/data/shoutatyourdecks/analytics/card-inclusion.json");
}

export function useCommunityPopularity() {
  return usePublishedData<PopularityData>("shoutatyourdecks-popularity", "/data/shoutatyourdecks/analytics/popularity.json");
}

export function useCommunityPriceDistribution() {
  return usePublishedData<PriceDistributionData>(
    "shoutatyourdecks-price-distribution",
    "/data/shoutatyourdecks/analytics/price-distribution.json",
  );
}

export function useCommunityArchetypes() {
  return usePublishedData<ShoutAtYourDecksArchetypeClusteringData>(
    "shoutatyourdecks-archetypes",
    "/data/shoutatyourdecks/analytics/archetypes.json",
  );
}

export function useCommunityDeckEra() {
  return usePublishedData<DeckEraData>("shoutatyourdecks-deck-era", "/data/shoutatyourdecks/analytics/deck-era.json");
}

export function useCommunityCoOccurrence() {
  return usePublishedData<CommunityCoOccurrenceData>("shoutatyourdecks-co-occurrence", "/data/shoutatyourdecks/analytics/co-occurrence.json");
}

export function useCardDeckReferences() {
  return usePublishedData<CardDeckReferencesData>("shoutatyourdecks-deck-references", "/data/shoutatyourdecks/analytics/deck-references.json");
}

/** "Diao Chan" -> "diao-chan" — the inverse of CommunityDecksIndex.tsx's formatChampionName. Every real champion name today is plain ASCII words (confirmed against the real byChampion keys), so a simple lowercase+hyphenate is sufficient. */
export function championToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
