import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { computeDeckTestResult, type DeckTestNearestDeck, type DeckTestResult } from "../../lib/deckTestResult";
import { useArchetypeTaxonomyData, useCardImpactData, useMatchupCardImpactData } from "../archetypes/data";
import { useDeckWinConditions } from "./useDeckWinConditions";

export interface UseDeckTestResultInputs {
  /** Main+material card-copy multiset — "deck identity" convention. */
  deckCardCounts: Map<string, number>;
  cardsByName: Map<string, Card>;
  /** Present for a real published deck; absent for a Deck Builder build in progress. */
  deckId?: string;
  /** Already-resolved by the caller (useNearestDecks for a build in progress, SimilarityData.topMatches for a real deck) — different sources, normalized to one shape here. */
  nearestDecks: DeckTestNearestDeck[];
}

/**
 * Thin wrapper around `computeDeckTestResult` — same "pure compute + thin hook" pattern as
 * `useDeckWinConditions`. Wires together the published datasets the report needs
 * (`useArchetypeTaxonomyData`, `useCardImpactData`, `useMatchupCardImpactData`) plus the already-
 * generic win-conditions trio, so callers (a real deck page or the Guided Deck Builder) only ever
 * pass in plain card data. `loading` is true until the taxonomy has loaded — everything else this
 * report reads is optional/absent-tolerant.
 */
export function useDeckTestResult(inputs: UseDeckTestResultInputs): { result: DeckTestResult | null; loading: boolean } {
  const { deckCardCounts, cardsByName, deckId, nearestDecks } = inputs;

  const taxonomy = useArchetypeTaxonomyData();
  const cardImpactData = useCardImpactData();
  const matchupCardImpactData = useMatchupCardImpactData();

  const deckCardNames = useMemo(() => [...deckCardCounts.keys()], [deckCardCounts]);
  const { interactions: winConditions } = useDeckWinConditions(deckCardNames, cardsByName);

  const result = useMemo(() => {
    if (!taxonomy) return null;
    return computeDeckTestResult({
      deckCardCounts,
      taxonomy,
      matchupCardImpactData,
      deckClusterIndex: cardImpactData?.deckClusterIndex,
      deckId,
      winConditions,
      nearestDecks,
    });
  }, [deckCardCounts, taxonomy, matchupCardImpactData, cardImpactData, deckId, winConditions, nearestDecks]);

  return { result, loading: !taxonomy };
}
