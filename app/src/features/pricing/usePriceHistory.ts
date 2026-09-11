import type { PriceHistoryData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function usePriceHistoryData(enabled = true): PriceHistoryData | undefined {
  return usePublishedData<PriceHistoryData>("price-history", "/data/priceHistory.json", enabled);
}
