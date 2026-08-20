import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";
import { championBonusesFor } from "../../lib/championBonus";

/** Every card carrying a `[<championName> Bonus]` effect tied to this Champion specifically. */
export function useChampionBonusCards(championName: string | null): Card[] {
  const catalog = useCardCatalog();
  return useMemo(() => {
    if (!championName) return [];
    return catalog.filter((c) => championBonusesFor(c).includes(championName)).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, championName]);
}
