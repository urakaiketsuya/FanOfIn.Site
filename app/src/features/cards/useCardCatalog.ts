import { createSharedLiveQuery } from "../../lib/sharedLiveQuery";
import { useMemo } from "react";
import { withSpoilerCards } from "../../lib/spoilerCatalog";
import { db } from "../../lib/db";
import type { Card } from "@gatcg/shared";

const useCatalog = createSharedLiveQuery<Card[]>(() => db.cards.toArray(), []);

/** All locally-cached cards, reactive to the sync writing more in as it runs. */
export function useCardCatalog(enabled = true): Card[] {
  const cards = useCatalog(enabled);
  return useMemo(() => enabled ? withSpoilerCards(cards) : cards, [cards, enabled]);
}
