import { useLiveQuery } from "dexie-react-hooks";
import type { Card } from "@gatcg/shared";
import { db } from "../../lib/db";

export function useTimelineChampions(includeSpirits = false) {
  return useLiveQuery(() => db.cards.filter(card => card.types.includes("CHAMPION") && (includeSpirits || !card.subtypes.includes("SPIRIT"))).toArray(), [includeSpirits]);
}

// One representative card per explicitly named champion, in deck-description order.
// This identifies the recap's deck label, not a reconstructed registered list.
export function championsForDeck(deck: string, cards: Card[] = []) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const words = ` ${normalize(deck)} `;
  const matches = new Map<string, { card: Card; position: number }>();
  for (const card of cards) {
    if (card.subtypes?.includes("SPIRIT")) continue;
    const name = normalize(card.name.split(",")[0]);
    const position = words.indexOf(` ${name} `);
    if (position >= 0 && !matches.has(name)) matches.set(name, { card, position });
  }
  return [...matches.values()].sort((a, b) => a.position - b.position).map(({ card }) => card);
}

export function roundLabel(round: string) {
  return round.split("(")[0].replace(/\s+—\s+(?!Quarterfinal|Semifinal).*$/, "").trim();
}
