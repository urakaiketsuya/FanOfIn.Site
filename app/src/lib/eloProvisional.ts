/**
 * Below this many recorded matches, a player's Elo hasn't had enough games to converge — a single
 * upset can still swing it by a large margin, yet nothing today distinguishes that rating from one
 * built on hundreds of games (real data: 41% of the 13,367 rated players have fewer than 10
 * matches, including 192 with exactly 1). Same order of magnitude as this codebase's other
 * "not enough sample" bars (`cardImpactMinSampleSize`/`minBattleChartSampleSize`, both 5 in
 * pipeline/src/config.ts), roughly doubled since Elo needs more games to converge than a simple
 * win-rate average does.
 */
export const PROVISIONAL_MATCH_THRESHOLD = 10;

export function isProvisionalRating(matches: number): boolean {
  return matches < PROVISIONAL_MATCH_THRESHOLD;
}
