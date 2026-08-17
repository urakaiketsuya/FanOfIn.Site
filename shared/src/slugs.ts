export function slugify(input: string): string {
  const NFKD_COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
  return input
    .normalize("NFKD")
    .replace(NFKD_COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Central slug/URL scheme so pipeline output keys and SPA routes agree.
 * Cards and sets reuse the identifiers the Grand Archive API already gives us;
 * everything else (players, archetypes, seasons) is derived here so both
 * `pipeline` and `app` produce the same value from the same input.
 */
export const routes = {
  card: (cardSlug: string) => `/cards/${cardSlug}`,
  set: (setPrefix: string) => `/sets/${setPrefix}`,
  champion: (championCardSlug: string) => `/champions/${championCardSlug}`,
  event: (omnidexEventId: number | string) => `/events/${omnidexEventId}`,
  season: (seasonSlug: string) => `/seasons/${seasonSlug}`,
  player: (playerSlug: string) => `/players/${playerSlug}`,
  archetype: (archetypeSlug: string) => `/archetypes/${archetypeSlug}`,
};

export function seasonSlug(year: number, format: string): string {
  return slugify(`${year}-${format}`);
}

/** Omnidex usernames aren't guaranteed URL-safe or globally unique on their own. */
export function playerSlug(username: string, omnidexPlayerId: number | string): string {
  return `${slugify(username)}-${omnidexPlayerId}`;
}

export function archetypeSlug(name: string): string {
  return slugify(name);
}
