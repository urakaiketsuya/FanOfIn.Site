import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

export function useTimelineChampions() {
  return useLiveQuery(() => db.cards.filter(card => card.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT")).toArray(), []);
}

// Representative champion art only; never infer a registered list from commentary.
export function championForDeck(deck: string, cards: Card[] = []) {
  const words = ` ${deck.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const matches = cards.filter(card => words.includes(` ${card.name.split(",")[0].toLowerCase()} `));
  const names = new Set(matches.map(card => card.name.split(",")[0]));
  return names.size === 1 ? matches[0] : undefined;
}

export function roundLabel(round: string) {
  return round.split("(")[0].replace(/\s+—\s+(?!Quarterfinal|Semifinal).*$/, "").trim();
}
