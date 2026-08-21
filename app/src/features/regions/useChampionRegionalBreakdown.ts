import { useMemo } from "react";
import { useRegionalDecks } from "./useRegionalDecks";
import { useDeckPopularityIndexData } from "../topdecks/data";

const MIN_DECKS = 3;

export interface ChampionRegionRow {
  code: string;
  label: string;
  deckCount: number;
  avgWinRate: number;
}

export interface ChampionRegionalBreakdown {
  rows: ChampionRegionRow[];
  loading: boolean;
}

/**
 * The inverse pivot of useRegionalChampions.ts — instead of "which champions are popular in this
 * region," this is "which regions play this champion the most." Always country-level (not the
 * broader region grouping) since a per-champion breakdown is naturally finer-grained than the
 * top-level Regions page's own region/country toggle.
 */
export function useChampionRegionalBreakdown(championName: string | null): ChampionRegionalBreakdown {
  const { loading, options, regionByDeckId } = useRegionalDecks("country");
  const deckPopularity = useDeckPopularityIndexData();

  return useMemo((): ChampionRegionalBreakdown => {
    if (loading || !deckPopularity || !championName) return { rows: [], loading: loading || !deckPopularity };

    const byRegion = new Map<string, { deckCount: number; winRateSum: number }>();
    for (const e of deckPopularity.entries) {
      if (e.championName !== championName) continue;
      const region = regionByDeckId.get(e.deckId);
      if (!region) continue;
      const acc = byRegion.get(region) ?? { deckCount: 0, winRateSum: 0 };
      acc.deckCount += 1;
      acc.winRateSum += e.winRate;
      byRegion.set(region, acc);
    }

    const labelByCode = new Map(options.map((o) => [o.code, o.label]));
    const rows = Array.from(byRegion.entries())
      .filter(([, acc]) => acc.deckCount >= MIN_DECKS)
      .map(([code, acc]) => ({
        code,
        label: labelByCode.get(code) ?? code,
        deckCount: acc.deckCount,
        avgWinRate: acc.winRateSum / acc.deckCount,
      }))
      .sort((a, b) => b.deckCount - a.deckCount);

    return { rows, loading: false };
  }, [loading, deckPopularity, championName, regionByDeckId, options]);
}
