import type { ChampionSeasonPerformance, ChampionTrend, ChampionTrendDirection, ChampionTrendsData, DeckSighting } from "@gatcg/shared";
import { config } from "../config.js";

/** Percentage-point change in season share below which a trend counts as "stable" rather than rising/falling. */
const STABLE_BAND_PCT = 2;

interface SeasonAccum {
  seasonId: number;
  seasonName: string;
  firstEventDate: string;
}

interface ChampionSeasonAccum {
  deckCount: number;
  events: Set<number>;
  winCount: number;
  topCutCount: number;
  winRateSum: number;
  totalWeightedScore: number;
}

/**
 * Per-champion, per-season performance and a rising/falling classification — built on top of
 * `computeDeckSightings` output rather than re-walking event bundles, since sightings already
 * carry every field this needs (season, Champion, weightedScore). See docs/CALCULATIONS.md for
 * why `shareOfSeason` (not raw score) is the trend metric: backfill coverage grew a lot season to
 * season (2,488 -> 11,808 sightings across the dataset), so raw totals aren't comparable but each
 * season's total is a fair normalizer.
 */
export function computeChampionTrends(sightings: DeckSighting[]): ChampionTrendsData {
  const seasons = new Map<number, SeasonAccum>();
  for (const s of sightings) {
    if (s.seasonId === null || s.seasonName === null) continue;
    const existing = seasons.get(s.seasonId);
    if (!existing || s.eventDate < existing.firstEventDate) {
      seasons.set(s.seasonId, { seasonId: s.seasonId, seasonName: s.seasonName, firstEventDate: s.eventDate });
    }
  }
  const seasonOrder = Array.from(seasons.values()).sort((a, b) => a.firstEventDate.localeCompare(b.firstEventDate));

  const byChampion = new Map<string, Map<number, ChampionSeasonAccum>>();
  const seasonTotals = new Map<number, number>();

  for (const s of sightings) {
    if (!s.championName || s.seasonId === null) continue;
    const bySeason = byChampion.get(s.championName) ?? new Map<number, ChampionSeasonAccum>();
    const accum = bySeason.get(s.seasonId) ?? {
      deckCount: 0,
      events: new Set<number>(),
      winCount: 0,
      topCutCount: 0,
      winRateSum: 0,
      totalWeightedScore: 0,
    };
    accum.deckCount += 1;
    accum.events.add(s.eventId);
    if (s.winner) accum.winCount += 1;
    if (s.topCut) accum.topCutCount += 1;
    accum.winRateSum += s.winRate;
    accum.totalWeightedScore += s.weightedScore;
    bySeason.set(s.seasonId, accum);
    byChampion.set(s.championName, bySeason);

    seasonTotals.set(s.seasonId, (seasonTotals.get(s.seasonId) ?? 0) + s.weightedScore);
  }

  const champions: ChampionTrend[] = Array.from(byChampion.entries()).map(([championName, bySeason]) => {
    const seasonPerf: ChampionSeasonPerformance[] = seasonOrder.map(({ seasonId, seasonName }) => {
      const a = bySeason.get(seasonId);
      const seasonTotal = seasonTotals.get(seasonId) ?? 0;
      return {
        seasonId,
        seasonName,
        deckCount: a?.deckCount ?? 0,
        eventCount: a?.events.size ?? 0,
        winCount: a?.winCount ?? 0,
        topCutCount: a?.topCutCount ?? 0,
        avgWinRate: a && a.deckCount > 0 ? a.winRateSum / a.deckCount : 0,
        totalWeightedScore: a?.totalWeightedScore ?? 0,
        shareOfSeason: a && seasonTotal > 0 ? a.totalWeightedScore / seasonTotal : 0,
      };
    });

    const { trend, trendDeltaPct } = classifyTrend(seasonPerf);
    return { championName, seasons: seasonPerf, trend, trendDeltaPct };
  });

  champions.sort((a, b) => b.seasons[b.seasons.length - 1]?.totalWeightedScore - a.seasons[a.seasons.length - 1]?.totalWeightedScore);

  return { generatedAt: new Date().toISOString(), seasonOrder: seasonOrder.map((s) => s.seasonName), champions };
}

function classifyTrend(seasonPerf: ChampionSeasonPerformance[]): { trend: ChampionTrendDirection; trendDeltaPct: number | null } {
  if (seasonPerf.length < 2) return { trend: "insufficient-data", trendDeltaPct: null };

  const latest = seasonPerf[seasonPerf.length - 1];
  const prev = seasonPerf[seasonPerf.length - 2];
  const threshold = config.minBattleChartSampleSize;

  if (prev.deckCount === 0 && latest.deckCount === 0) return { trend: "insufficient-data", trendDeltaPct: null };
  if (prev.deckCount === 0 && latest.deckCount >= threshold) {
    return { trend: "new", trendDeltaPct: (latest.shareOfSeason - prev.shareOfSeason) * 100 };
  }
  if (prev.deckCount >= threshold && latest.deckCount === 0) {
    return { trend: "absent", trendDeltaPct: (latest.shareOfSeason - prev.shareOfSeason) * 100 };
  }
  if (prev.deckCount < threshold || latest.deckCount < threshold) {
    return { trend: "insufficient-data", trendDeltaPct: null };
  }

  const deltaPct = (latest.shareOfSeason - prev.shareOfSeason) * 100;
  if (deltaPct > STABLE_BAND_PCT) return { trend: "rising", trendDeltaPct: deltaPct };
  if (deltaPct < -STABLE_BAND_PCT) return { trend: "falling", trendDeltaPct: deltaPct };
  return { trend: "stable", trendDeltaPct: deltaPct };
}
