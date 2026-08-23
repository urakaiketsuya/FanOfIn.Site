import { useMemo } from "react";
import { useOmnidexIndex } from "./data";

export interface LatestSeason {
  id: number;
  name: string;
  dateStart: string;
  dateEnd: string;
}

/** The most recently-ended tracked season, from the same already-published `omnidex-index` dataset `useDecklistCoverage` reads — for the Guided Deck Builder's "recent season only" pool, no new pipeline data needed. */
export function useLatestSeason(): LatestSeason | null {
  const indexData = useOmnidexIndex();
  return useMemo(() => {
    if (!indexData || indexData.seasons.length === 0) return null;
    return [...indexData.seasons].sort((a, b) => b.dateEnd.localeCompare(a.dateEnd))[0];
  }, [indexData]);
}
