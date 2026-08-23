/** Published pricing data shape (data/prices.json), produced by the pipeline, consumed by the app. */

export interface PriceQuote {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
}

export interface CardPriceEntry {
  cardName: string;
  tcgplayerProductId: number;
  tcgplayerUrl: string;
  normal: PriceQuote | null;
  foil: PriceQuote | null;
}

export interface PriceData {
  generatedAt: string;
  /** Keyed by `priceKey(setPrefix, collectorNumber)`. */
  prices: Record<string, CardPriceEntry>;
}

/** Join key between a Grand Archive edition (set.prefix + collector_number) and a TCGCSV product (group.abbreviation + extendedData "Number"). */
export function priceKey(setPrefix: string, collectorNumber: string): string {
  return `${setPrefix}-${collectorNumber}`;
}

/** ~1 year of weekly snapshots (the pipeline's refresh cadence) — tunable, not final. Bounds `PriceHistoryData` to a flat steady-state size instead of growing forever. */
export const PRICE_HISTORY_MAX_POINTS = 52;

/** One snapshot of a single edition's market price. Only `market` is tracked (not the full low/mid/high spread) — a trend line only needs one number per point, and `market` is already the number treated as "the real price" everywhere else in this codebase. */
export interface PriceHistoryPoint {
  /** The pipeline run's `generatedAt` that produced this point. */
  date: string;
  normalMarket: number | null;
  foilMarket: number | null;
}

export interface PriceHistoryData {
  generatedAt: string;
  /** Keyed by `priceKey(setPrefix, collectorNumber)` — same join key as `PriceData.prices`. Chronological oldest-first, capped to `PRICE_HISTORY_MAX_POINTS` per edition. */
  history: Record<string, PriceHistoryPoint[]>;
}
