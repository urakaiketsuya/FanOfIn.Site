import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { DeckFormat } from "@gatcg/shared";
import { championSlugsFor, mergeCardInclusionBuckets } from "../../community/data";
import { useCardsByNames } from "../../events/useCardsByNames";
import { usePriceTrendByName } from "../../pricing/usePriceTrendByName";
import type { RatingPillar } from "../../../lib/deckIdentity";
import { computeCardDecay } from "../../../lib/cardDecay";
import { buildSuggestedDeck } from "../engine/buildSuggestedDeck";
import { deriveArchetypeOptions, deriveReviewGroups } from "../engine/builderSelectors";
import { useDeckBuilderData } from "../data/useDeckBuilderData";
import type { BuilderWorkbenchView } from "../components/BuilderWorkbenchNav";
import type { CollectionMode, LockedSection, PopulationSource } from "../model/builderTypes";
import { computeIdentityElements, findChampionCard, useSuggestedBuild } from "../useSuggestedBuild";
import { useCommunitySuggestedBuild } from "../useCommunitySuggestedBuild";
import { useSimulatorSuggestedBuild } from "../useSimulatorSuggestedBuild";

interface BuilderRecommendationModelOptions {
  championName: string | null;
  spiritFilter: string | null;
  setSpiritFilter: Dispatch<SetStateAction<string | null>>;
  deckFormat: DeckFormat;
  tab: BuilderWorkbenchView;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  championLevelCap: number | null;
  populationSource: PopulationSource;
  collectionMode: CollectionMode;
  maybeboard: Map<string, number>;
  spiritElement: string | null;
}

/** Loads recommendation evidence and turns the current selections into a complete suggested build. */
export function useBuilderRecommendationModel(options: BuilderRecommendationModelOptions) {
  const {
    championName, spiritFilter, setSpiritFilter, deckFormat, tab, lockedCards, lockedSections,
    rejectedCards, pillarBias, archetypeId, championLevelCap, populationSource, collectionMode,
    maybeboard, spiritElement,
  } = options;
  const loadPrices = Boolean(championName && spiritFilter && tab === "build");
  const priceTrendByName = usePriceTrendByName(loadPrices);
  const [dismissedReviewCards, setDismissedReviewCards] = useState<Set<string>>(new Set());
  const builderData = useDeckBuilderData({
    championName,
    format: deckFormat,
    includeDecodedDecks: false,
    needs: {
      archetypes: tab === "tools" || archetypeId !== null,
      cardImpact: false,
      coOccurrence: false,
      composition: false,
      prices: loadPrices,
      simulator: populationSource === "simulator",
    },
  });
  const {
    popularityIndex: popularityIndexData,
    liveCatalogByName,
    catalog: cardCatalog,
    catalogByName,
    spiritCanonicalNames,
    collectionOwnedByName,
    population: { rows, spiritsPresent, loading: populationLoading },
    cardQuantityStats: cardQuantityStatsData,
    archetypeTaxonomy: archetypeTaxonomyData,
    communityInclusion: communityCardInclusion,
    simulatorSummary,
    priceByName,
  } = builderData;

  const seedLockedCards = useMemo(() => new Map(
    Array.from(lockedCards.entries()).filter(([name]) => !catalogByName.get(name)?.types.includes("CHAMPION")),
  ), [lockedCards, catalogByName]);

  useEffect(() => {
    if (!spiritFilter) return;
    const canonical = spiritCanonicalNames.get(spiritFilter);
    if (canonical && canonical !== spiritFilter) setSpiritFilter(canonical);
  }, [spiritFilter, spiritCanonicalNames, setSpiritFilter]);

  const collectionRejectedCards = useMemo(() => {
    if (collectionMode !== "owned-only") return rejectedCards;
    const next = new Set(rejectedCards);
    for (const card of cardCatalog) {
      if ((collectionOwnedByName.get(card.name) ?? 0) === 0 && !lockedCards.has(card.name)) next.add(card.name);
    }
    return next;
  }, [collectionMode, rejectedCards, cardCatalog, collectionOwnedByName, lockedCards]);
  const archetypeOptions = useMemo(
    () => deriveArchetypeOptions(championName, archetypeTaxonomyData),
    [championName, archetypeTaxonomyData],
  );
  const selectedArchetype = useMemo(
    () => archetypeOptions.some((option) => option.id === archetypeId)
      ? archetypeTaxonomyData?.clusters.find((cluster) => cluster.id === archetypeId)
      : undefined,
    [archetypeTaxonomyData, archetypeId, archetypeOptions],
  );
  const archetypePrevalence = useMemo(
    () => selectedArchetype
      ? new Map(selectedArchetype.definingCards.map((card) => [card.name, card.prevalence]))
      : undefined,
    [selectedArchetype],
  );
  const recommendationRows = useMemo(() => {
    if (!selectedArchetype) return rows;
    const deckIds = new Set(selectedArchetype.deckIds);
    return rows.filter((row) => deckIds.has(row.deckId));
  }, [rows, selectedArchetype]);
  const championCard = useMemo(
    () => findChampionCard(recommendationRows, lockedCards, catalogByName),
    [recommendationRows, lockedCards, catalogByName],
  );
  const spiritCardForIdentity = spiritFilter ? catalogByName.get(spiritFilter) : undefined;
  const identityElements = useMemo(
    () => computeIdentityElements(championCard, spiritCardForIdentity),
    [championCard, spiritCardForIdentity],
  );
  const communityChampData = useMemo(() => {
    if (!communityCardInclusion || !championName) return undefined;
    const slugs = championSlugsFor(Object.keys(communityCardInclusion.byChampion), championName);
    return slugs.length > 0
      ? mergeCardInclusionBuckets(slugs.map((slug) => communityCardInclusion.byChampion[slug]))
      : undefined;
  }, [communityCardInclusion, championName]);
  const communityInclusionByName = useMemo(
    () => communityChampData ? new Map(communityChampData.cards.map((card) => [card.name, card])) : undefined,
    [communityChampData],
  );
  const communityLockedCards = useMemo(() => {
    if (deckFormat !== "PANTHEON" || !spiritFilter) return lockedCards;
    return new Map(lockedCards).set(spiritFilter, 1);
  }, [deckFormat, spiritFilter, lockedCards]);
  const decayReport = useMemo(
    () => computeCardDecay(recommendationRows, spiritFilter, catalogByName),
    [recommendationRows, spiritFilter, catalogByName],
  );
  const decayingCardBoost = useMemo(
    () => decayReport ? new Map(decayReport.signals.map((signal) => [signal.cardName, signal.decay])) : undefined,
    [decayReport],
  );
  const decaySignalByName = useMemo(
    () => decayReport ? new Map(decayReport.signals.map((signal) => [signal.cardName, signal])) : undefined,
    [decayReport],
  );
  const tournamentInclusionByName = useMemo(() => {
    if (recommendationRows.length === 0) return undefined;
    const counts = new Map<string, number>();
    for (const row of recommendationRows) {
      for (const name of row.main.keys()) counts.set(name, (counts.get(name) ?? 0) + 1);
      for (const name of row.material.keys()) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return new Map(Array.from(counts, ([name, count]) => [name, count / recommendationRows.length]));
  }, [recommendationRows]);
  const hypeGapByName = useMemo(() => {
    if (!communityInclusionByName || !tournamentInclusionByName) return undefined;
    return new Map(Array.from(communityInclusionByName, ([name, entry]) => [
      name,
      entry.percentOfDecks - (tournamentInclusionByName.get(name) ?? 0),
    ]));
  }, [communityInclusionByName, tournamentInclusionByName]);

  const tournamentBuild = useSuggestedBuild(
    recommendationRows, spiritFilter, lockedCards, collectionRejectedCards, populationLoading,
    lockedSections, cardQuantityStatsData, championCard, pillarBias, undefined, undefined,
    archetypePrevalence, collectionOwnedByName, collectionMode, championLevelCap,
  );
  const balancedBuild = useSuggestedBuild(
    recommendationRows, spiritFilter, lockedCards, collectionRejectedCards, populationLoading,
    lockedSections, cardQuantityStatsData, championCard, pillarBias, communityInclusionByName,
    decayingCardBoost, archetypePrevalence, collectionOwnedByName, collectionMode, championLevelCap,
  );
  const communityBuild = useCommunitySuggestedBuild(
    communityChampData, communityLockedCards, lockedSections, collectionRejectedCards, catalogByName,
    !communityCardInclusion, identityElements, deckFormat, championCard, spiritCardForIdentity,
  );
  const simulatorResult = useSimulatorSuggestedBuild(communityBuild, simulatorSummary, cardCatalog);
  const effectivePopulationSource: PopulationSource = deckFormat === "PANTHEON" ? "community" : populationSource;
  const build = useMemo(() => buildSuggestedDeck(
    { format: deckFormat, populationSource, collectionMode },
    { tournament: tournamentBuild, balanced: balancedBuild, community: communityBuild, simulator: simulatorResult.build, collectionOwnedByName },
  ), [deckFormat, populationSource, collectionMode, tournamentBuild, balancedBuild, communityBuild, simulatorResult.build, collectionOwnedByName]);
  const reviewSuggestions = useMemo(
    () => build.suggestions.filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.suggestions, dismissedReviewCards],
  );
  const reviewRemovals = useMemo(
    () => build.removalSuggestions.filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.removalSuggestions, dismissedReviewCards],
  );
  const reviewGroups = useMemo(
    () => deriveReviewGroups(reviewRemovals, reviewSuggestions),
    [reviewRemovals, reviewSuggestions],
  );
  const reviewItemCount = reviewGroups.pairs.length + reviewGroups.unpairedRemovals.length + reviewGroups.unpairedSuggestions.length;
  const reviewRemovalNames = useMemo(() => new Set(reviewRemovals.map((card) => card.cardName)), [reviewRemovals]);

  useEffect(() => setDismissedReviewCards(new Set()), [championName, spiritFilter, effectivePopulationSource, pillarBias, archetypeId]);

  const gateLoading = deckFormat === "PANTHEON"
    ? !communityCardInclusion
    : effectivePopulationSource === "community"
      ? !communityCardInclusion
      : effectivePopulationSource === "simulator"
        ? !communityCardInclusion || !simulatorSummary
        : populationLoading;
  const gateHasData = deckFormat === "PANTHEON" || effectivePopulationSource === "community" || effectivePopulationSource === "simulator"
    ? Boolean(communityChampData)
    : rows.length > 0;
  const spiritStats = useMemo(() => {
    const stats = new Map<string, { decks: number }>();
    for (const spirit of spiritsPresent) stats.set(spirit, { decks: rows.filter((row) => row.spiritName === spirit).length });
    return stats;
  }, [rows, spiritsPresent]);
  const sortedSpirits = useMemo(
    () => [...spiritsPresent].sort((a, b) => (spiritStats.get(b)?.decks ?? 0) - (spiritStats.get(a)?.decks ?? 0) || a.localeCompare(b)),
    [spiritsPresent, spiritStats],
  );
  const spiritElements = useMemo(
    () => Array.from(new Set(sortedSpirits.flatMap((name) => liveCatalogByName.get(name)?.elements ?? [])))
      .filter((element) => element !== "NORM").sort(),
    [sortedSpirits, liveCatalogByName],
  );
  const spiritsForElement = useMemo(
    () => spiritElement ? sortedSpirits.filter((name) => liveCatalogByName.get(name)?.elements.includes(spiritElement)) : sortedSpirits,
    [spiritElement, sortedSpirits, liveCatalogByName],
  );
  const spiritOptionLabel = (name: string): string => {
    const stats = spiritStats.get(name);
    return stats ? `${name} — ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"}` : name;
  };
  const championsPresent = useMemo(() => Array.from(new Set(cardCatalog
    .filter((card) => card.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT") && card.legality?.[deckFormat]?.limit !== 0)
    .map((card) => card.name.split(",")[0].trim()))).sort(), [cardCatalog, deckFormat]);
  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((card) => card.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const allNames = useMemo(
    () => [...build.material, ...build.main, ...build.sideboard].map((card) => card.cardName),
    [build.material, build.main, build.sideboard],
  );
  const suggestionNames = useMemo(() => build.suggestions.map((card) => card.cardName), [build.suggestions]);
  const cardsByName = useCardsByNames(useMemo(
    () => [...allNames, ...suggestionNames, ...maybeboard.keys()],
    [allNames, suggestionNames, maybeboard],
  ));

  return {
    popularityIndexData, liveCatalogByName, cardCatalog, catalogByName, spiritCanonicalNames,
    simulatorSummary, priceByName, priceTrendByName, seedLockedCards, communityInclusionByName,
    hypeGapByName, decaySignalByName, build, reviewItemCount, reviewRemovalNames, gateLoading,
    gateHasData, spiritElements, spiritsForElement, spiritOptionLabel, championsPresent, cardNames,
    cardNameSet, cardsByName, identityElements, effectivePopulationSource, simulatorResult,
    archetypeOptions, dismissedReviewCards, setDismissedReviewCards,
  };
}
