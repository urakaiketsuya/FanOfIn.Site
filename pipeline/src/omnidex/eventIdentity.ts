import type { OmnidexPlayer } from "@gatcg/shared";

/** Unknown or tied first place never borrows another player's champion. */
export function eventIdentity(players: OmnidexPlayer[], champions: Map<number, { championName: string | null }>) {
  const placed = players.filter(player => player.finalPlacement != null && player.finalPlacement > 0);
  const best = Math.min(...placed.map(player => player.finalPlacement!));
  const leaders = placed.filter(player => player.finalPlacement === best);
  if (leaders.length !== 1) return null;
  const player = leaders[0];
  const championName = champions.get(player.id)?.championName;
  return championName ? { championName, playerName: player.username, placement: best } : null;
}
