import type { PlayerRival, PlayerRivalsProfile } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";

const TOP_RIVALS = 10;

interface OpponentAccum {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * For each player, their most-played opponents ("rivals") — selected by games played against
 * them, then ordered by win rate ascending (worst matchups first). Walks the same
 * `pairingsByRound` data elo.ts replays, just keyed by (player, opponent) instead of folded into
 * a single running rating.
 */
export function computeRivals(bundles: OmnidexEventBundle[]): PlayerRivalsProfile[] {
  const byPlayer = new Map<number, Map<number, OpponentAccum>>();

  for (const bundle of bundles) {
    for (const roundData of bundle.pairingsByRound) {
      if ("error" in roundData) continue;

      for (const pairing of roundData.pairings) {
        if (pairing.pairing.length !== 2) continue; // byes and similar have no opponent to track

        // Team-battle formats return a team name string for `id` instead of a real player id —
        // same skip elo.ts uses, see its comment for the data that justifies it.
        if (pairing.pairing.some((side) => typeof side.id !== "number")) continue;

        const [a, b] = pairing.pairing;
        for (const [self, opponent] of [
          [a, b],
          [b, a],
        ] as const) {
          const opponents = byPlayer.get(self.id) ?? new Map<number, OpponentAccum>();
          const acc = opponents.get(opponent.id) ?? { wins: 0, losses: 0, ties: 0 };
          if (self.status === "winner") acc.wins += 1;
          else if (self.status === "loser") acc.losses += 1;
          else acc.ties += 1;
          opponents.set(opponent.id, acc);
          byPlayer.set(self.id, opponents);
        }
      }
    }
  }

  return Array.from(byPlayer.entries()).map(([playerId, opponents]) => {
    const rivals: PlayerRival[] = Array.from(opponents.entries())
      .map(([opponentId, acc]): PlayerRival => {
        const games = acc.wins + acc.losses + acc.ties;
        return { opponentId, games, wins: acc.wins, losses: acc.losses, ties: acc.ties, winRate: (acc.wins + acc.ties * 0.5) / games };
      })
      .sort((a, b) => b.games - a.games)
      .slice(0, TOP_RIVALS)
      .sort((a, b) => a.winRate - b.winRate);

    return { playerId, rivals };
  });
}
