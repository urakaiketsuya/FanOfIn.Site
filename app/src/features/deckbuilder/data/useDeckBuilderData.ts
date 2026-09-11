import { useEffect, useMemo, useState } from "react";
import { buildSpiritCanonicalNames, type CollectionEntry, type DeckFormat } from "@gatcg/shared";
import { useCommunityBlendedCardInclusion, useCommunityBlendedCoOccurrence, useCommunityCardInclusion, useCommunityCoOccurrence } from "../../community/data";
import { useDeckPopularityIndexData } from "../../topdecks/data";
import { useArchetypeTaxonomyData, useCardImpactData, useCardQuantityStatsData, useCompositionWinRateData, useMatchupCardImpactData } from "../../archetypes/data";
import { useCardCatalog } from "../../cards/useCardCatalog";
import { useSimulatorSummaryData } from "../../simulator/data";
import { useDeckPriceByName } from "../../pricing/useDeckPriceByName";
import { useAllDecodedDecks } from "../../../lib/decodedDecks";
import { accountApi } from "../../../lib/accountApi";
import { useDeckBuilderPopulation } from "../useDeckBuilderPopulation";

export interface DeckBuilderDataNeeds {
  archetypes?: boolean;
  cardImpact?: boolean;
  coOccurrence?: boolean;
  composition?: boolean;
  prices?: boolean;
  simulator?: boolean;
}

const ALL_DATA_NEEDS: Required<DeckBuilderDataNeeds> = {
  archetypes: true,
  cardImpact: true,
  coOccurrence: true,
  composition: true,
  prices: true,
  simulator: true,
};

/** External evidence gateway for the builder. It owns retrieval and source fallback policy, not selections or recommendation logic. */
export function useDeckBuilderData({ championName, format, includeDecodedDecks, needs = ALL_DATA_NEEDS }: { championName: string | null; format: DeckFormat; includeDecodedDecks: boolean; needs?: DeckBuilderDataNeeds }) {
  const hasChampion = championName !== null;
  const popularityIndex = useDeckPopularityIndexData(hasChampion);
  const liveCatalog = useCardCatalog();
  const liveCatalogByName = useMemo(() => new Map(liveCatalog.map((card) => [card.name, card])), [liveCatalog]);
  const catalog = liveCatalog;
  const catalogByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const spiritCanonicalNames = useMemo(() => buildSpiritCanonicalNames(catalog), [catalog]);

  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  useEffect(() => {
    const refresh = () => { void accountApi.collection().then((result) => setCollection(result.entries)).catch(() => undefined); };
    refresh();
    window.addEventListener("fanofin:collection-updated", refresh);
    return () => window.removeEventListener("fanofin:collection-updated", refresh);
  }, []);
  const collectionOwnedByName = useMemo(() => new Map(collection.map((entry) => [entry.cardName, entry.ownedQuantity])), [collection]);

  const population = useDeckBuilderPopulation(championName);
  const cardQuantityStats = useCardQuantityStatsData(hasChampion);
  const compositionWinRates = useCompositionWinRateData(hasChampion && needs.composition === true);
  const archetypeTaxonomy = useArchetypeTaxonomyData(hasChampion && needs.archetypes === true);
  const decodedDecks = useAllDecodedDecks(includeDecodedDecks);

  const blendedInclusion = useCommunityBlendedCardInclusion(format, hasChampion);
  const needsStandaloneInclusion = hasChampion && blendedInclusion !== undefined && Object.keys(blendedInclusion.byChampion).length === 0;
  const standaloneInclusion = useCommunityCardInclusion(format, needsStandaloneInclusion);
  const communityInclusion = blendedInclusion && Object.keys(blendedInclusion.byChampion).length > 0 ? blendedInclusion : standaloneInclusion;
  const loadCoOccurrence = hasChampion && needs.coOccurrence === true;
  const blendedCoOccurrence = useCommunityBlendedCoOccurrence(format, loadCoOccurrence);
  const needsStandaloneCoOccurrence = loadCoOccurrence && blendedCoOccurrence !== undefined && Object.keys(blendedCoOccurrence.byChampion).length === 0;
  const standaloneCoOccurrence = useCommunityCoOccurrence(format, needsStandaloneCoOccurrence);
  const communityCoOccurrence = blendedCoOccurrence && Object.keys(blendedCoOccurrence.byChampion).length > 0 ? blendedCoOccurrence : standaloneCoOccurrence;

  return {
    popularityIndex,
    liveCatalog,
    liveCatalogByName,
    catalog,
    catalogByName,
    spiritCanonicalNames,
    collection,
    collectionOwnedByName,
    population,
    cardQuantityStats,
    compositionWinRates,
    archetypeTaxonomy,
    cardImpact: useCardImpactData(hasChampion && needs.cardImpact === true),
    matchupCardImpact: useMatchupCardImpactData(hasChampion && needs.cardImpact === true),
    decodedDecks: decodedDecks.decks,
    communityInclusion,
    communityCoOccurrence,
    simulatorSummary: useSimulatorSummaryData(hasChampion && needs.simulator === true),
    priceByName: useDeckPriceByName(hasChampion && needs.prices === true),
  };
}
