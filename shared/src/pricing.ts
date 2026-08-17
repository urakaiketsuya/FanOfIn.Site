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
