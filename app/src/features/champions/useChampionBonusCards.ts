import { useMemo } from "react";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useCardCatalog } from "../cards/useCardCatalog";
import { championBonusesFor } from "../../lib/championBonus";

/** Every card carrying a `[<championName> Bonus]` effect tied to this Champion specifically. */
export function useChampionBonusCards(championName: string | null) {
  const catalog = useCardCatalog();
  const progress = useSyncProgress();
  const cards = useMemo(() => {
    if (!championName) return [];
    return catalog.filter((c) => championBonusesFor(c).includes(championName)).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, championName]);
  return { cards, phase: progress.phase, hasCatalog: catalog.length > 0 };
}
