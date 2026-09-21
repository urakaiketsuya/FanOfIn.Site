import type { DeckPopularityEntry } from "@gatcg/shared";

export interface TopDecksListEntry {
  deckId: string;
  player: number;
  eventId: number;
  eventName: string;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
  underplaced: boolean;
  eventDate?: string;
  deckHash?: string | null;
}

/** Adds the event display name that the lean popularity index deliberately omits. */
export function toTopDecksListEntry(entry: DeckPopularityEntry, eventNameById: ReadonlyMap<number, string>): TopDecksListEntry {
  return {
    deckId: entry.deckId,
    player: entry.player,
    eventId: entry.eventId,
    eventName: eventNameById.get(entry.eventId) ?? `Event #${entry.eventId}`,
    placement: entry.placement,
    wins: entry.wins,
    losses: entry.losses,
    ties: entry.ties,
    underplaced: entry.underplaced,
  };
}
