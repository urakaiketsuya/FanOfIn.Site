import type { ChampionTrendsData } from "@gatcg/shared";

export type RaceMetric = "shareOfSeason" | "topCutCount";

/** Preserve the pipeline's chronological order; IDs need not be chronological. */
export function championRaceFrames(data: ChampionTrendsData, metric: RaceMetric) {
  return data.seasonOrder.map((name) => {
    const rows = data.champions.flatMap((champion) => {
      const season = champion.seasons.find((entry) => entry.seasonName === name);
      return season && season.deckCount > 0 ? [{ name: champion.championName, ...season, value: season[metric] }] : [];
    }).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return { name, rows: rows.map((row) => ({ ...row, rank: rows.findIndex((other) => other.value === row.value) + 1 })) };
  });
}
