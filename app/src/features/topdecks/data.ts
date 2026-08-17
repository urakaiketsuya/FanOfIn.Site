import type { DeckSightingsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useDeckSightingsData(): DeckSightingsData | undefined {
  return usePublishedData<DeckSightingsData>("analysis-deck-sightings", "/data/analysis/deck-sightings.json");
}
