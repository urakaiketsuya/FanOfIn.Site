import type {
  ArchetypeData,
  ArchetypeTaxonomyData,
  CardImpactData,
  CardQuantityStatsData,
  CardStatsData,
  ChampionTrendsData,
  CompositionWinRateData,
  DeckCardIndexData,
  KeywordStatsData,
  MatchupCardImpactData,
  SimilarityData,
} from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useArchetypeData(): ArchetypeData | undefined {
  return usePublishedData<ArchetypeData>("analysis-archetypes", "/data/analysis/archetypes.json");
}

export function useKeywordStatsData(): KeywordStatsData | undefined {
  return usePublishedData<KeywordStatsData>("analysis-keyword-stats", "/data/analysis/keyword-stats.json");
}

export function useArchetypeTaxonomyData(): ArchetypeTaxonomyData | undefined {
  return usePublishedData<ArchetypeTaxonomyData>("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json");
}

export function useChampionTrendsData(): ChampionTrendsData | undefined {
  return usePublishedData<ChampionTrendsData>("analysis-champion-trends", "/data/analysis/champion-trends.json");
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

export function useCardImpactData(): CardImpactData | undefined {
  return usePublishedData<CardImpactData>("analysis-card-impact", "/data/analysis/card-impact.json");
}

export function useMatchupCardImpactData(): MatchupCardImpactData | undefined {
  return usePublishedData<MatchupCardImpactData>("analysis-matchup-card-impact", "/data/analysis/matchup-card-impact.json");
}

export function useCardQuantityStatsData(): CardQuantityStatsData | undefined {
  return usePublishedData<CardQuantityStatsData>("analysis-card-quantity-stats", "/data/analysis/card-quantity-stats.json");
}

export function useCompositionWinRateData(): CompositionWinRateData | undefined {
  return usePublishedData<CompositionWinRateData>("analysis-composition-win-rates", "/data/analysis/composition-win-rates.json");
}
