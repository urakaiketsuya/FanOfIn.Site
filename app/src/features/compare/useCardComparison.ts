import { useMemo } from "react";
import type { Card, CardStat } from "@gatcg/shared";
import { useCardStatsData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";

export interface CardComparisonRow {
  name: string;
  card: Card | undefined;
  /** Undefined when the card has too little play (or none at all) to appear in cards.json — same tolerance every other stats surface already has for a niche/new card. */
  stat: CardStat | undefined;
}

/** Joins the local card catalog against the published usage/win-rate stats for an arbitrary, user-chosen list of card names — the individual-card sibling of `useComparisonData`'s deck-vs-deck join. */
export function useCardComparison(names: string[]): CardComparisonRow[] {
  const cardStatsData = useCardStatsData();
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  const statByName = useMemo(() => new Map((cardStatsData?.cards ?? []).map((c) => [c.name, c])), [cardStatsData]);

  return useMemo(
    () => names.map((name) => ({ name, card: catalogByName.get(name), stat: statByName.get(name) })),
    [names, catalogByName, statByName],
  );
}
