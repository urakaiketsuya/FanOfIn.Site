import { useMemo, useState } from "react";
import type { CardImpactData, ClusterMatchupImpact, MatchupCardImpactData } from "@gatcg/shared";
import type { NearestDeck } from "./useNearestDecks";

export interface BuildCounters {
  /** The real deck `clusterMatchups` is proxied off of — null until `useNearestDecks` has a result that belongs to a named cluster. */
  sourceDeck: NearestDeck | null;
  /** Sorted by games descending, same default-to-most-played convention as DeckDetail.tsx's own `clusterMatchups`. */
  clusterMatchups: ClusterMatchupImpact[];
  opponentClusterId: string | null;
  setOpponentClusterId: (id: string | null) => void;
  selectedMatchup: ClusterMatchupImpact | undefined;
}

/**
 * "What beats this build" for a deck still under construction — it has no `deckId` of its own to
 * look up in `CardImpactData.deckClusterIndex`, so this proxies off the closest real deck among
 * `useNearestDecks`' own similarity ranking instead. Only ~128 named-build clusters exist against a
 * ~57k-deck universe, so the top nearest deck often isn't clustered — this scans past those
 * near-misses for the first one that is, rather than giving up after `nearestDecks[0]`.
 *
 * Same `matchupCardImpactData` shape and "default to most-played, don't flatten across opponents"
 * reasoning as DeckDetail.tsx's `clusterMatchups`/`selectedMatchup` (see that file and
 * ArchetypeHurtYouView.tsx's doc comments) — this is that same pattern, just sourced from a
 * proxy deck instead of the build's own `deckId`.
 */
export function useBuildCounters(
  nearestDecks: NearestDeck[],
  cardImpactData: CardImpactData | undefined,
  matchupCardImpactData: MatchupCardImpactData | undefined,
): BuildCounters {
  const [opponentClusterId, setOpponentClusterId] = useState<string | null>(null);

  const sourceDeck = useMemo(() => {
    if (!cardImpactData) return null;
    return nearestDecks.find((d) => cardImpactData.deckClusterIndex[d.deckId]) ?? null;
  }, [nearestDecks, cardImpactData]);

  const clusterId = sourceDeck && cardImpactData ? cardImpactData.deckClusterIndex[sourceDeck.deckId] : undefined;

  const clusterMatchups = useMemo(
    () => (matchupCardImpactData && clusterId
      ? matchupCardImpactData.matchups.filter((m) => m.clusterId === clusterId).sort((a, b) => b.games - a.games)
      : []),
    [matchupCardImpactData, clusterId],
  );

  const selectedMatchup = clusterMatchups.find(
    (m) => m.opponentClusterId === (opponentClusterId ?? clusterMatchups[0]?.opponentClusterId),
  );

  return { sourceDeck, clusterMatchups, opponentClusterId, setOpponentClusterId, selectedMatchup };
}
