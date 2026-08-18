/**
 * Builds a `/compare` link that seeds the compare set from specific event+player sightings —
 * read by `CompareIndex.tsx`'s `add` query param. Used for "compare these decklists" links from
 * event pairings (both sides of a match) and achievement unlocks (the one deck behind a badge, or
 * both decks in a Giant Slayer upset).
 */
export function buildCompareLink(pairs: { eventId: number; player: number }[]): string {
  const add = pairs.map(({ eventId, player }) => `${eventId}:${player}`).join(",");
  return `/compare?${new URLSearchParams({ add }).toString()}`;
}
