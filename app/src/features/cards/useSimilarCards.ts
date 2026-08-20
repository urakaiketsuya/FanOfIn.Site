import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "./useCardCatalog";
import { similarCards } from "../../lib/cardSimilarity";

/** Cards with a matching ability template (same types/subtypes, same effect text once numbers are
 * normalized away) — for comparing cost/stats side by side, not an "upgrade" verdict. */
export function useSimilarCards(card: Card | null): Card[] {
  const catalog = useCardCatalog();
  return useMemo(() => (card ? similarCards(card, catalog) : []), [card, catalog]);
}
