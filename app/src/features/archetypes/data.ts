import type {
  ArchetypeData,
  ArchetypeTaxonomyData,
  ArchetypeTaxonomyValidationData,
  CardImpactData,
  CardQuantityStatsData,
  CardStatsByChampionData,
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

export function useKeywordStatsData(enabled = true): KeywordStatsData | undefined {
  return usePublishedData<KeywordStatsData>("analysis-keyword-stats", "/data/analysis/keyword-stats.json", enabled);
}

export function useArchetypeTaxonomyData(enabled = true): ArchetypeTaxonomyData | undefined {
  return usePublishedData<ArchetypeTaxonomyData>("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json", enabled);
}

export function useArchetypeTaxonomyValidationData(): ArchetypeTaxonomyValidationData | undefined {
  return usePublishedData<ArchetypeTaxonomyValidationData>(
    "analysis-archetype-taxonomy-validation",
    "/data/analysis/archetype-taxonomy-validation.json",
  );
}

export function useChampionTrendsData(): ChampionTrendsData | undefined {
  return usePublishedData<ChampionTrendsData>("analysis-champion-trends", "/data/analysis/champion-trends.json");
}

export function useCardStatsData(enabled = true): CardStatsData | undefined {
  return usePublishedData<CardStatsData>("analysis-cards", "/data/analysis/cards.json", enabled);
}

export function useDeckCardIndexData(enabled = true): DeckCardIndexData | undefined {
  return usePublishedData<DeckCardIndexData>("analysis-deck-card-index", "/data/analysis/deck-card-index.json", enabled);
}

export function useSimilarityData(enabled = true): SimilarityData | undefined {
  return usePublishedData<SimilarityData>("analysis-similarity", "/data/analysis/similarity.json", enabled);
}

export function useCardImpactData(enabled = true): CardImpactData | undefined {
  return usePublishedData<CardImpactData>("analysis-card-impact", "/data/analysis/card-impact.json", enabled);
}

export function useMatchupCardImpactData(enabled = true): MatchupCardImpactData | undefined {
  return usePublishedData<MatchupCardImpactData>("analysis-matchup-card-impact", "/data/analysis/matchup-card-impact.json", enabled);
}

export function useCardQuantityStatsData(enabled = true): CardQuantityStatsData | undefined {
  return usePublishedData<CardQuantityStatsData>("analysis-card-quantity-stats", "/data/analysis/card-quantity-stats.json", enabled);
}

export function useCompositionWinRateData(enabled = true): CompositionWinRateData | undefined {
  return usePublishedData<CompositionWinRateData>("analysis-composition-win-rates", "/data/analysis/composition-win-rates.json", enabled);
}

export function useCardStatsByChampionData(enabled = true): CardStatsByChampionData | undefined {
  return usePublishedData<CardStatsByChampionData>("analysis-card-stats-by-champion", "/data/analysis/card-stats-by-champion.json", enabled);
}
