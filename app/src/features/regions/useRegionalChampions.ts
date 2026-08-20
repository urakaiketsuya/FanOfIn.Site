import { useMemo } from "react";
import { useDeckPopularityIndexData } from "../topdecks/data";

const MIN_CHAMPION_DECKS = 3;

export interface RegionalChampionRow {
  championName: string;
  deckCount: number;
  share: number;
  avgWinRate: number;
}

export interface RegionalChampions {
  rows: RegionalChampionRow[];
  loading: boolean;
}

/** Champion popularity for the selected region — covers every deck sighting, not just clustered ones (unlike the Archetypes breakdown), since it doesn't need a named build to group by. */
export function useRegionalChampions(regionByDeckId: Map<string, string>, regionKey: string | null): RegionalChampions {
  const deckPopularity = useDeckPopularityIndexData();

  return useMemo((): RegionalChampions => {
    if (!deckPopularity || !regionKey) return { rows: [], loading: !deckPopularity };

    const byChampion = new Map<string, { deckCount: number; winRateSum: number }>();
    let total = 0;
    for (const e of deckPopularity.entries) {
      if (!e.championName || regionByDeckId.get(e.deckId) !== regionKey) continue;
      total += 1;
      const acc = byChampion.get(e.championName) ?? { deckCount: 0, winRateSum: 0 };
      acc.deckCount += 1;
      acc.winRateSum += e.winRate;
      byChampion.set(e.championName, acc);
    }

    const rows = Array.from(byChampion.entries())
      .filter(([, acc]) => acc.deckCount >= MIN_CHAMPION_DECKS)
      .map(([championName, acc]) => ({
        championName,
        deckCount: acc.deckCount,
        share: total > 0 ? acc.deckCount / total : 0,
        avgWinRate: acc.winRateSum / acc.deckCount,
      }))
      .sort((a, b) => b.deckCount - a.deckCount);

    return { rows, loading: false };
  }, [deckPopularity, regionByDeckId, regionKey]);
}
