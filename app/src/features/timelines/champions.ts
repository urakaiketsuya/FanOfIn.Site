import { useMemo } from "react";
import { useCardCatalog } from "../cards/useCardCatalog";

export function useTimelineChampions(includeSpirits = false) {
  const cards = useCardCatalog();
  return useMemo(() => cards.filter(card => card.types.includes("CHAMPION") && (includeSpirits || !card.subtypes.includes("SPIRIT"))), [cards, includeSpirits]);
}

export { timelineChampions as championsForDeck } from "@gatcg/shared";

export { timelineRoundLabel as roundLabel } from "@gatcg/shared";
