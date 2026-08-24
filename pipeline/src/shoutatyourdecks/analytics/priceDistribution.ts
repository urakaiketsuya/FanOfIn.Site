import type { PriceDistributionData, PriceStats, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { config } from "../../config.js";

/** Nearest-rank percentile over a pre-sorted ascending array — simple and fine at this sample size (thousands of decks), no interpolation needed for a summary stat like this. */
function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}

function computeStats(prices: number[]): PriceStats | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
  };
}

export function computePriceDistribution(summaries: ShoutAtYourDecksDeckSummary[]): PriceDistributionData {
  const priced = summaries.filter((s): s is ShoutAtYourDecksDeckSummary & { priceLow: number } => s.priceLow !== null);

  const byChampionPrices = new Map<string, number[]>();
  for (const s of priced) {
    const key = s.champion ?? "unknown";
    const list = byChampionPrices.get(key);
    if (list) list.push(s.priceLow);
    else byChampionPrices.set(key, [s.priceLow]);
  }

  const byChampion: Record<string, PriceStats> = {};
  for (const [champion, prices] of byChampionPrices) {
    if (prices.length < config.sydMinChampionSampleSize) continue;
    const stats = computeStats(prices);
    if (stats) byChampion[champion] = stats;
  }

  return {
    generatedAt: new Date().toISOString(),
    decksConsidered: priced.length,
    overall: computeStats(priced.map((s) => s.priceLow)),
    byChampion,
  };
}
