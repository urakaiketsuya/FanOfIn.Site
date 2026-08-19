import type { DeckPopularityIndexData, DeckSightingsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useDeckSightingsData(): DeckSightingsData | undefined {
  return usePublishedData<DeckSightingsData>("analysis-deck-sightings", "/data/analysis/deck-sightings.json");
}

/** Lean championName/winRate/event-context projection of deck-sightings.json — see DeckPopularityEntry's doc comment. Use this instead of useDeckSightingsData() wherever the full per-sighting detail (keywords, price, etc.) isn't actually needed. */
export function useDeckPopularityIndexData(): DeckPopularityIndexData | undefined {
  return usePublishedData<DeckPopularityIndexData>("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json");
}
