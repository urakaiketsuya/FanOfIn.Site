import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "./useCardCatalog";
import { intentCards, type IntentCards } from "../../lib/cardIntent";

/** Cards designed to work with this one — a shared token economy (e.g. Powercell) or a tribal/subtype category referenced as a cost or condition. See docs/CALCULATIONS.md's "Intent cards" section. */
export function useIntentCards(card: Card | null): IntentCards {
  const catalog = useCardCatalog();
  return useMemo(() => (card ? intentCards(card, catalog) : { feeds: [], poweredBy: [] }), [card, catalog]);
}
