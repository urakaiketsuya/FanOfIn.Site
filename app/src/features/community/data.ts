import type { CardInclusionData, PopularityData, PriceDistributionData, ShoutAtYourDecksArchetypeClusteringData } from "@gatcg/shared";
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
