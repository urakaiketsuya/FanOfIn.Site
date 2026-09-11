import type { SimulatorSummary } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useSimulatorSummaryData(enabled = true): SimulatorSummary | undefined {
  return usePublishedData<SimulatorSummary>("simulator-summary", "/data/simulator/summary.json", enabled);
}
