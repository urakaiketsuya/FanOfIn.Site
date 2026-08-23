import type { PriceHistoryData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function usePriceHistoryData(): PriceHistoryData | undefined {
  return usePublishedData<PriceHistoryData>("price-history", "/data/priceHistory.json");
}
