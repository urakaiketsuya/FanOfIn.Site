import { useMemo } from "react";
import { useArchetypeTaxonomyData, useChampionTrendsData } from "../archetypes/data";

const MAX_ARCHETYPES = 20;

export interface SeasonChampionRow {
  championName: string;
  deckCount: number;
  eventCount: number;
  avgWinRate: number;
  shareOfSeason: number;
  topCutCount: number;
}

export interface SeasonArchetypeRow {
  clusterId: string;
  name: string;
  championName: string;
  deckCount: number;
  avgWinRate: number;
}

export interface SeasonMeta {
  champions: SeasonChampionRow[];
  archetypes: SeasonArchetypeRow[];
  loading: boolean;
}

/**
 * Pivots two already-published, already-season-broken-out datasets (champion-trends.json,
 * archetype-taxonomy.json — both power existing per-Champion/per-build "By Season" views) into a
 * per-season view instead: "what was the meta in this season," not "how did this Champion trend
 * across seasons." Pure client-side query, no new pipeline data.
 */
export function useSeasonMeta(seasonId: number | null): SeasonMeta {
  const trendsData = useChampionTrendsData();
  const taxonomyData = useArchetypeTaxonomyData();

  const champions = useMemo(() => {
    if (seasonId === null || !trendsData) return [];
    const rows: SeasonChampionRow[] = [];
    for (const trend of trendsData.champions) {
      const season = trend.seasons.find((s) => s.seasonId === seasonId);
      if (!season || season.deckCount === 0) continue;
      rows.push({
        championName: trend.championName,
        deckCount: season.deckCount,
        eventCount: season.eventCount,
        avgWinRate: season.avgWinRate,
        shareOfSeason: season.shareOfSeason,
        topCutCount: season.topCutCount,
      });
    }
    return rows.sort((a, b) => b.deckCount - a.deckCount);
  }, [trendsData, seasonId]);

  const archetypes = useMemo(() => {
    if (seasonId === null || !taxonomyData) return [];
    const rows: SeasonArchetypeRow[] = [];
    for (const cluster of taxonomyData.clusters) {
      const season = cluster.seasons.find((s) => s.seasonId === seasonId);
      if (!season || season.deckCount === 0) continue;
      rows.push({
        clusterId: cluster.id,
        name: cluster.name,
        championName: cluster.championName,
        deckCount: season.deckCount,
        avgWinRate: season.avgWinRate,
      });
    }
    return rows.sort((a, b) => b.deckCount - a.deckCount).slice(0, MAX_ARCHETYPES);
  }, [taxonomyData, seasonId]);

  return { champions, archetypes, loading: !trendsData || !taxonomyData };
}
