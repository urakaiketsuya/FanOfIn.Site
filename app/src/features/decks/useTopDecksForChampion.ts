import { useMemo } from "react";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useArchetypeTaxonomyData } from "../archetypes/data";

export interface TopDeckRef {
  eventId: number;
  player: number;
  weightedScore: number;
}

export interface TopArchetypeDeckRef extends TopDeckRef {
  clusterName: string;
  avgWinRate: number;
}

export interface TopDecksForChampion {
  /** The single best-performing sighting for this Champion overall, by the same tier-weighted
   * placement score Top Decks' "best" sort uses. */
  bestOverall: TopDeckRef | null;
  /** The best-performing sighting within this Champion's highest-avgWinRate named build — null
   * when the Champion has no clustered builds at all. */
  bestArchetype: TopArchetypeDeckRef | null;
}

/** Resolves "the top deck for this Champion" two ways — best overall placement, or best within
 * the Champion's strongest named build — for a one-click "compare with a top deck" link. Both
 * exclude `excludeDeckId` so a deck is never suggested as its own comparison target. */
export function useTopDecksForChampion(championName: string | null, excludeDeckId?: string): TopDecksForChampion {
  const popularityIndexData = useDeckPopularityIndexData();
  const taxonomyData = useArchetypeTaxonomyData();

  return useMemo((): TopDecksForChampion => {
    if (!championName || !popularityIndexData) return { bestOverall: null, bestArchetype: null };

    const entries = popularityIndexData.entries.filter((e) => e.championName === championName && e.deckId !== excludeDeckId);

    const bestOverall = entries.reduce<TopDeckRef | null>((best, e) => {
      if (!best || e.weightedScore > best.weightedScore) return { eventId: e.eventId, player: e.player, weightedScore: e.weightedScore };
      return best;
    }, null);

    let bestArchetype: TopArchetypeDeckRef | null = null;
    if (taxonomyData) {
      const cluster = taxonomyData.clusters
        .filter((c) => c.championName === championName)
        .reduce<(typeof taxonomyData.clusters)[number] | null>((best, c) => (!best || c.avgWinRate > best.avgWinRate ? c : best), null);
      if (cluster) {
        const clusterDeckIds = new Set(cluster.deckIds);
        const best = entries
          .filter((e) => clusterDeckIds.has(e.deckId))
          .reduce<TopDeckRef | null>((best, e) => {
            if (!best || e.weightedScore > best.weightedScore) return { eventId: e.eventId, player: e.player, weightedScore: e.weightedScore };
            return best;
          }, null);
        if (best) bestArchetype = { ...best, clusterName: cluster.name, avgWinRate: cluster.avgWinRate };
      }
    }

    return { bestOverall, bestArchetype };
  }, [championName, excludeDeckId, popularityIndexData, taxonomyData]);
}
