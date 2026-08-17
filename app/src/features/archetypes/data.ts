import type { ArchetypeData, CardStatsData, DeckCardIndexData, SimilarityData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useArchetypeData(): ArchetypeData | undefined {
  return usePublishedData<ArchetypeData>("analysis-archetypes", "/data/analysis/archetypes.json");
}

export function useCardStatsData(): CardStatsData | undefined {
  return usePublishedData<CardStatsData>("analysis-cards", "/data/analysis/cards.json");
}

export function useDeckCardIndexData(): DeckCardIndexData | undefined {
  return usePublishedData<DeckCardIndexData>("analysis-deck-card-index", "/data/analysis/deck-card-index.json");
}

export function useSimilarityData(): SimilarityData | undefined {
  return usePublishedData<SimilarityData>("analysis-similarity", "/data/analysis/similarity.json");
}
