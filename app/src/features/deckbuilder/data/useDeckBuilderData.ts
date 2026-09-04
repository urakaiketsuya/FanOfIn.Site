import { useEffect, useMemo, useState } from "react";
import type { CollectionEntry, DeckFormat } from "@gatcg/shared";
import { useCommunityBlendedCardInclusion, useCommunityBlendedCoOccurrence, useCommunityCardInclusion, useCommunityCoOccurrence } from "../../community/data";
import { useDeckPopularityIndexData } from "../../topdecks/data";
import { useArchetypeTaxonomyData, useCardImpactData, useCardQuantityStatsData, useCompositionWinRateData, useMatchupCardImpactData } from "../../archetypes/data";
import { useCardCatalog } from "../../cards/useCardCatalog";
import { useSimulatorSummaryData } from "../../simulator/data";
import { useDeckPriceByName } from "../../pricing/useDeckPriceByName";
import { useAllDecodedDecks } from "../../../lib/decodedDecks";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import { accountApi } from "../../../lib/accountApi";
import { buildSpiritCanonicalNames, useDeckBuilderPopulation } from "../useDeckBuilderPopulation";

/** External evidence gateway for the builder. It owns retrieval and source fallback policy, not selections or recommendation logic. */
export function useDeckBuilderData({ championName, format, includeDecodedDecks }: { championName: string | null; format: DeckFormat; includeDecodedDecks: boolean }) {
  const popularityIndex = useDeckPopularityIndexData();
  const liveCatalog = useCardCatalog();
  const liveCatalogByName = useMemo(() => new Map(liveCatalog.map((card) => [card.name, card])), [liveCatalog]);
  const catalog = useDebouncedValue(liveCatalog, 500);
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
  const cardQuantityStats = useCardQuantityStatsData();
  const compositionWinRates = useCompositionWinRateData();
  const archetypeTaxonomy = useArchetypeTaxonomyData();
  const decodedDecks = useAllDecodedDecks(includeDecodedDecks);

  const blendedInclusion = useCommunityBlendedCardInclusion(format);
  const standaloneInclusion = useCommunityCardInclusion(format);
  const communityInclusion = blendedInclusion && Object.keys(blendedInclusion.byChampion).length > 0 ? blendedInclusion : standaloneInclusion;
  const blendedCoOccurrence = useCommunityBlendedCoOccurrence(format);
  const standaloneCoOccurrence = useCommunityCoOccurrence(format);
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
    cardImpact: useCardImpactData(),
    matchupCardImpact: useMatchupCardImpactData(),
    decodedDecks: decodedDecks.decks,
    communityInclusion,
    communityCoOccurrence,
    simulatorSummary: useSimulatorSummaryData(),
    priceByName: useDeckPriceByName(),
  };
}
