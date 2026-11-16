import { useMemo } from "react";
import { useCardStatsData } from "../archetypes/data";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

export function useCardWinRates(enabled: boolean) {
  const data = useCardStatsData(enabled);
  const status = usePublishedDataStatus("analysis-cards", "/data/analysis/cards.json", enabled);
  const rates = useMemo(() => new Map((data?.cards ?? []).filter(card => Number.isFinite(card.adjustedWinRate)).map(card => [card.name, card.adjustedWinRate])), [data]);
  return { rates, status, loaded: data !== undefined };
}
