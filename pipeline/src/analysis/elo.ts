import type { PlayerRating, UpsetMatch } from "@gatcg/shared";
import { config } from "../config.js";
import type { OmnidexEventBundle } from "../omnidex/cache.js";

const BASELINE_RATING = 1500;

export interface EloResult {
  ratings: Map<number, PlayerRating>;
  upsets: UpsetMatch[];
}

/**
 * Processes completed events in chronological order, accumulating each player's rating from
 * Omnidex's own per-match `eloChange` values rather than reimplementing an Elo formula — the
 * API already computes it per match, so this just replays those deltas onto a running total.
 */
export function computeEloRatings(bundles: OmnidexEventBundle[]): EloResult {
  const ratings = new Map<number, PlayerRating>();
  const upsets: UpsetMatch[] = [];

  const sorted = [...bundles].sort((a, b) => a.event.date.localeCompare(b.event.date));

  for (const bundle of sorted) {
    for (let roundIndex = 0; roundIndex < bundle.pairingsByRound.length; roundIndex++) {
      const roundData = bundle.pairingsByRound[roundIndex];
      if ("error" in roundData) continue;

      for (const pairing of roundData.pairings) {
        if (pairing.pairing.length !== 2) continue; // byes and similar have no opponent to rate against

        // Team-battle formats (e.g. 3v3) return a team name string for `id` and omit `eloChange`
        // entirely on both sides — verified against real data: every pairing side with a
        // non-numeric `id` also has no `eloChange`, a perfect 1:1 correlation across 970 sides
        // checked. Omnidex just doesn't track individual Elo for these matches, so there's
        // nothing to accumulate; skip rather than corrupt the ratings map with a team-name key
        // and a NaN rating.
        if (pairing.pairing.some((side) => typeof side.id !== "number" || typeof side.eloChange !== "number")) {
          continue;
        }

        for (const side of pairing.pairing) {
          const existing = ratings.get(side.id) ?? {
            playerId: side.id,
            rating: BASELINE_RATING,
            matches: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            lastEventId: bundle.id,
            lastEventDate: bundle.event.date,
          };
          existing.rating += side.eloChange;
          existing.matches += 1;
          if (side.status === "winner") existing.wins += 1;
          else if (side.status === "loser") existing.losses += 1;
          else existing.ties += 1;
          existing.lastEventId = bundle.id;
          existing.lastEventDate = bundle.event.date;
          ratings.set(side.id, existing);
        }

        const [a, b] = pairing.pairing;
        const winner = a.status === "winner" ? a : b.status === "winner" ? b : null;
        const loser = a.status === "loser" ? a : b.status === "loser" ? b : null;
        if (winner && loser && Math.abs(winner.eloChange) >= config.upsetEloSwingThreshold) {
          upsets.push({
            eventId: bundle.id,
            eventName: bundle.event.name,
            eventDate: bundle.event.date,
            round: roundIndex + 1,
            winnerId: winner.id,
            loserId: loser.id,
            eloSwing: winner.eloChange,
          });
        }
      }
    }
  }

  return { ratings, upsets };
}
