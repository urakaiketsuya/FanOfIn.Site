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
