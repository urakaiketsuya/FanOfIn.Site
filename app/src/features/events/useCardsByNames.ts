import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";

export function useCardsByNames(names: string[]): Map<string, Card> {
  const cards = useCardCatalog();
  const key = JSON.stringify(names);
  return useMemo(() => {
    const wanted = new Set<string>(JSON.parse(key));
    return new Map(cards.filter(card => wanted.has(card.name)).map(card => [card.name, card]));
  }, [cards, key]);
}
