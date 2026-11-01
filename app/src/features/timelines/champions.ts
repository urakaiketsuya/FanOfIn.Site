import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";

export function useTimelineChampions(includeSpirits = false) {
  return useLiveQuery(() => db.cards.filter(card => card.types.includes("CHAMPION") && (includeSpirits || !card.subtypes.includes("SPIRIT"))).toArray(), [includeSpirits]);
}

export { timelineChampions as championsForDeck } from "@gatcg/shared";

export { timelineRoundLabel as roundLabel } from "@gatcg/shared";
