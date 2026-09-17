import { useMemo } from "react";
import type { Card, CardQuantityBucket, CardQuantityStatsData } from "@gatcg/shared";
import type { RatingPillar } from "../../lib/deckIdentity";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useCardCatalog } from "../cards/useCardCatalog";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";
import {
  buildTournamentSuggestedDeck,
  computeIdentityElements,
  findChampionCard,
  guoJiaFatestoneForIdentity,
  hasChampionBonus,
  IDENTITY_STAPLE_PREVALENCE,
  MIN_IDENTITY_STAPLE_POPULATION,
  isElementCompatible,
  type SuggestedBuild,
  type SuggestedCard,
} from "./suggestedBuild/buildTournamentSuggestedDeck";

export {
  buildTournamentSuggestedDeck,
  computeIdentityElements,
  findChampionCard,
  guoJiaFatestoneForIdentity,
  hasChampionBonus,
  IDENTITY_STAPLE_PREVALENCE,
  MIN_IDENTITY_STAPLE_POPULATION,
  isElementCompatible,
};
export type { SuggestedBuild, SuggestedCard };

const CATALOG_SETTLE_MS = 500;

export function useSuggestedBuild(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
  loading: boolean,
  lockedSections: Map<string, "main" | "material" | "sideboard"> = new Map(),
  cardQuantityStatsData?: CardQuantityStatsData,
  championCardOverride?: Card,
  pillarBias?: RatingPillar | null,
  communityInclusion?: Map<string, { percentOfDecks: number }>,
  decayingCards?: Map<string, number>,
  archetypePrevalence?: Map<string, number>,
  collectionOwnedByName?: Map<string, number>,
  collectionMode: "all" | "prioritize" | "owned-only" = "all",
  championLevelCap: number | null = null,
): SuggestedBuild {
  const cardCatalog = useCardCatalog();
  const settledCardCatalog = useDebouncedValue(cardCatalog, CATALOG_SETTLE_MS);
  const cardsByName = useMemo(() => new Map(settledCardCatalog.map((card) => [card.name, card])), [settledCardCatalog]);
  const quantityBucketsByName = useMemo(() => {
    const map = new Map<string, CardQuantityBucket[]>();
    for (const card of cardQuantityStatsData?.cards ?? []) map.set(card.name, card.quantities);
    return map;
  }, [cardQuantityStatsData]);
  return useMemo(
    () => buildTournamentSuggestedDeck(rows, spiritFilter, lockedCards, rejectedCards, loading, cardsByName, quantityBucketsByName, lockedSections, championCardOverride, pillarBias, communityInclusion, decayingCards, archetypePrevalence, collectionOwnedByName, collectionMode, championLevelCap),
    [rows, spiritFilter, lockedCards, rejectedCards, loading, cardsByName, quantityBucketsByName, lockedSections, championCardOverride, pillarBias, communityInclusion, decayingCards, archetypePrevalence, collectionOwnedByName, collectionMode, championLevelCap],
  );
}
