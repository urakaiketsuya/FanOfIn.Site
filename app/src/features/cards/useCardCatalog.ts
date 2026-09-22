import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";
import type { Card } from "@gatcg/shared";

/** All locally-cached cards, reactive to the sync writing more in as it runs. */
export function useCardCatalog(enabled = true): Card[] {
  return useLiveQuery(() => enabled ? db.cards.toArray() : [], [enabled], []) ?? [];
}
