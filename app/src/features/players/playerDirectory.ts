import type { OmnidexPlayerSummary, PlayerRating, DeckPopularityEntry } from '@gatcg/shared';

/** Directory membership never depends on having a rated match. Rank only real ratings. */
export function playerDirectoryRows(players: OmnidexPlayerSummary[], ratings: PlayerRating[]) {
  const byId = new Map(ratings.filter(rating => rating.matches > 0).map(rating => [rating.playerId, rating]));
  return players.map(player => ({ player, rating: byId.get(player.id) }))
    .sort((a, b) => {
      if (!!a.rating !== !!b.rating) return a.rating ? -1 : 1;
      return (b.rating?.rating ?? 0) - (a.rating?.rating ?? 0) || a.player.username.localeCompare(b.player.username) || a.player.id - b.player.id;
    })
    .map((row, index) => ({ ...row, rank: row.rating ? index + 1 : null }));
}

/** Accept Omni's displayed username#ID as well as names and numeric IDs. */
export function matchesPlayerSearch(player: Pick<OmnidexPlayerSummary, 'id' | 'username'>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return !needle || player.username.toLowerCase().includes(needle)
    || String(player.id) === needle || `#${player.id}` === needle
    || `${player.username}#${player.id}`.toLowerCase() === needle;
}

export function championEventCounts(events: Iterable<{ championName: string }>): { name: string; eventCount: number }[] {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.championName, (counts.get(event.championName) ?? 0) + 1);
  return [...counts].map(([name, eventCount]) => ({ name, eventCount }))
    .sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name));
}

/** Deduplicate by event; full-deck identities supersede public metadata. */
export function playerChampionHistory(player: OmnidexPlayerSummary | undefined, entries: readonly Pick<DeckPopularityEntry, 'player' | 'eventId' | 'championName'>[]) {
  const map = new Map((player?.championEvents ?? []).map(event => [event.eventId, event.championName]));
  for (const entry of entries) {
    if (entry.player === player?.id && entry.championName) map.set(entry.eventId, entry.championName);
  }
  return map;
}
