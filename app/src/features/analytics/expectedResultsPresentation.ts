import type { forecastDeck } from '@gatcg/shared';

export type ExpectedMatchup = Extract<ReturnType<typeof forecastDeck>, { status: 'ready' }>['matchups'][number];
export type MatchupOrder = 'common' | 'lowest' | 'highest';

/** Reorder presentation only; field weighting and forecast values remain unchanged. */
export function orderMatchups(matchups: readonly ExpectedMatchup[], order: MatchupOrder): ExpectedMatchup[] {
  return [...matchups].sort((a, b) => {
    const scoreOrder = order === 'lowest' ? a.score - b.score : order === 'highest' ? b.score - a.score : 0;
    return scoreOrder || b.share - a.share || a.champion.localeCompare(b.champion);
  });
}
