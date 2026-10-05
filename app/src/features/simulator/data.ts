import { useMemo } from "react";
import { useCardCatalog } from "../cards/useCardCatalog";
import { enrichSimulatorNames, type SimulatorSummary } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useSimulatorSummaryData(enabled = true): SimulatorSummary | undefined {
  const summary = usePublishedData<SimulatorSummary>("simulator-summary", "/data/simulator/summary.json", enabled);
  const cards = useCardCatalog();
  return useMemo(() => summary ? enrichSimulatorNames(summary, cards) : undefined, [summary, cards]);
}
