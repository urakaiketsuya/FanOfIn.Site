import { useMemo } from "react";
import { useArchetypeTaxonomyData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";

const MIN_CLUSTER_DECKS = 3;

export interface RegionalArchetypeRow {
  id: string;
  name: string;
  championName: string;
  deckCount: number;
  share: number;
  avgWinRate: number;
}

export interface RegionalArchetypes {
  rows: RegionalArchetypeRow[];
  loading: boolean;
}

/**
 * Regional breakdown of the same named-build clusters `archetype-taxonomy.json` already
 * publishes — filters each cluster's `deckIds` down to the selected region instead of
 * re-clustering per region (which would let cluster identity/`id` drift from the global
 * taxonomy for what's really the same build). Scoped to clustered decks only, same as the
 * global Archetypes page.
 */
export function useRegionalArchetypes(regionByDeckId: Map<string, string>, regionKey: string | null): RegionalArchetypes {
  const taxonomy = useArchetypeTaxonomyData();
  const deckPopularity = useDeckPopularityIndexData();

  return useMemo((): RegionalArchetypes => {
    if (!taxonomy || !deckPopularity || !regionKey) return { rows: [], loading: !taxonomy || !deckPopularity };

    const winRateByDeckId = new Map<string, number>();
    for (const e of deckPopularity.entries) winRateByDeckId.set(e.deckId, e.winRate);

    const raw = taxonomy.clusters
      .map((c) => {
        const memberDeckIds = c.deckIds.filter((id) => regionByDeckId.get(id) === regionKey);
        if (memberDeckIds.length < MIN_CLUSTER_DECKS) return null;
        const winRates = memberDeckIds.map((id) => winRateByDeckId.get(id)).filter((w): w is number => w !== undefined);
        const avgWinRate = winRates.length > 0 ? winRates.reduce((a, b) => a + b, 0) / winRates.length : 0;
        return { id: c.id, name: c.name, championName: c.championName, deckCount: memberDeckIds.length, avgWinRate };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const total = raw.reduce((sum, r) => sum + r.deckCount, 0);
    const rows = raw
      .map((r) => ({ ...r, share: total > 0 ? r.deckCount / total : 0 }))
      .sort((a, b) => b.deckCount - a.deckCount);

    return { rows, loading: false };
  }, [taxonomy, deckPopularity, regionByDeckId, regionKey]);
}
