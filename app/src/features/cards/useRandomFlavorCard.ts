import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "./useCardCatalog";

/** Picks from the shared catalog, including spoilers with published flavor text. */
export function useRandomFlavorCard(): Card | undefined {
  const cards = useCardCatalog();
  const [position] = useState(Math.random);
  return useMemo(() => {
    const candidates = cards.filter(card => card.flavor?.trim());
    return candidates[Math.floor(position * candidates.length)];
  }, [cards, position]);
}
