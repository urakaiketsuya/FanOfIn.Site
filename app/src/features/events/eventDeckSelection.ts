import type { OmnidexDecklistEntry } from "@gatcg/shared";

export interface EventDeckSelection {
  deck: OmnidexDecklistEntry;
  player: number;
  deckId: string;
}

/**
 * Resolves every player-derived deck action from the URL selection in one place. Invalid or
 * missing direct-link values deliberately fall back to the first ranked public decklist.
 */
export function resolveEventDeckSelection(
  eventId: number,
  decklists: OmnidexDecklistEntry[],
  requestedPlayer: string | null,
): EventDeckSelection | null {
  const parsedPlayer = requestedPlayer === null ? Number.NaN : Number(requestedPlayer);
  const deck = decklists.find((entry) => entry.player === parsedPlayer) ?? decklists[0];
  return deck ? { deck, player: deck.player, deckId: `${eventId}:${deck.player}` } : null;
}

export function eventDeckSearchParams(current: URLSearchParams, player: number): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set("tab", "decklists");
  next.set("player", String(player));
  return next;
}

export function nextEventDeckSearchIndex(current: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}
