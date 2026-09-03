import { useMemo } from "react";
import { usePriceLookup } from "./usePriceLookup";
import { usePriceHistoryData } from "./usePriceHistory";

export interface PriceTrendEntry {
  /** Fractional change (0.08 = +8%) between the earliest and latest point in the trailing window. */
  pctChange: number;
  /** How many published snapshots the comparison spans — fewer than the full window near a card's first appearance. */
  points: number;
}

// priceHistory.json is appended weekly (Phase 38, docs/CALCULATIONS.md), so 4 points is roughly a
// 30-day trend without hardcoding a date cutoff the data can't actually promise.
const TREND_WINDOW_POINTS = 4;

/**
 * Recent price trend per card name, using the same "cheapest available printing" edition choice
 * as useDeckPriceByName — so a card's trend badge lines up with whichever price is shown next to
 * it. Omits a card with fewer than 2 published snapshots for that edition.
 */
export function usePriceTrendByName(): Map<string, PriceTrendEntry> {
  const prices = usePriceLookup();
  const priceHistoryData = usePriceHistoryData();

  return useMemo(() => {
    const byName = new Map<string, PriceTrendEntry>();
    if (!priceHistoryData) return byName;

    const cheapestKeyByName = new Map<string, { key: string; market: number }>();
    for (const row of prices.values()) {
      const market = row.normal?.market ?? row.foil?.market ?? null;
      if (market === null) continue;
      const existing = cheapestKeyByName.get(row.cardName);
      if (existing === undefined || market < existing.market) cheapestKeyByName.set(row.cardName, { key: row.key, market });
    }

    for (const [name, { key }] of cheapestKeyByName) {
      const points = priceHistoryData.history[key];
      if (!points || points.length < 2) continue;
      const latest = points[points.length - 1];
      const priorIndex = Math.max(0, points.length - 1 - TREND_WINDOW_POINTS);
      const prior = points[priorIndex];
      const latestPrice = latest.normalMarket ?? latest.foilMarket;
      const priorPrice = prior.normalMarket ?? prior.foilMarket;
      if (latestPrice === null || priorPrice === null || priorPrice === 0) continue;
      byName.set(name, { pctChange: (latestPrice - priorPrice) / priorPrice, points: points.length - priorIndex });
    }
    return byName;
  }, [prices, priceHistoryData]);
}
