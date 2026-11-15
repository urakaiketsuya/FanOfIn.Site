import type { OmnidexPlayerSummary, PlayerRating } from '@gatcg/shared';

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
