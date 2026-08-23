import { useMemo } from "react";
import { useOmnidexIndex } from "./data";

export interface DecklistCoverage {
  totalEvents: number;
  coverageRate: number;
  latestSeasonName: string | null;
  latestSeasonCoverageRate: number | null;
  loading: boolean;
}

/**
 * What share of tracked tournaments ever had decklist submission enabled at all — real-data-
 * verified (2026-08-22): 7-14% depending on season, trending up but still a small minority even in
 * the most recent complete season. This is the ceiling under every decklist-derived stat on the
 * site (archetypes, Card Impact, the Guided Deck Builder, Compare) — not a pipeline processing
 * choice, `OmnidexEventSummary.decklists` comes straight from Omnidex's own per-event setting.
 * Pure client-side computation over the already-published omnidex-index dataset, no new pipeline
 * data needed.
 */
export function useDecklistCoverage(): DecklistCoverage {
  const indexData = useOmnidexIndex();

  return useMemo((): DecklistCoverage => {
    if (!indexData) return { totalEvents: 0, coverageRate: 0, latestSeasonName: null, latestSeasonCoverageRate: null, loading: true };

    const totalEvents = indexData.events.length;
    let withDecklists = 0;
    for (const e of indexData.events) if (e.decklists) withDecklists++;

    const latestSeason = [...indexData.seasons].sort((a, b) => b.dateEnd.localeCompare(a.dateEnd))[0] ?? null;
    let latestTotal = 0;
    let latestWithDecklists = 0;
    if (latestSeason) {
      for (const e of indexData.events) {
        if (e.seasonId !== latestSeason.id) continue;
        latestTotal++;
        if (e.decklists) latestWithDecklists++;
      }
    }

    return {
      totalEvents,
      coverageRate: totalEvents > 0 ? withDecklists / totalEvents : 0,
      latestSeasonName: latestSeason?.name ?? null,
      latestSeasonCoverageRate: latestTotal > 0 ? latestWithDecklists / latestTotal : null,
      loading: false,
    };
  }, [indexData]);
}
