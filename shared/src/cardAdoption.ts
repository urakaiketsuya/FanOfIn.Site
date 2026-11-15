import type { CardAdoptionPeriods, CardStat } from './analysis-types.js';

/** Inclusion-rate change (fraction, not relative growth). Missing populations are unavailable. */
export function cardAdoption(
  card: Pick<CardStat, 'recentDeckCount' | 'priorDeckCount'>,
  periods: CardAdoptionPeriods | undefined,
): { recent: number; prior: number; change: number } | null {
  if (!periods) return null;
  const recentStart = Date.parse(periods.recent.start);
  const recentEnd = Date.parse(periods.recent.end);
  const priorStart = Date.parse(periods.prior.start);
  const priorEnd = Date.parse(periods.prior.end);
  if (![recentStart, recentEnd, priorStart, priorEnd].every(Number.isFinite)
    || recentStart !== priorEnd || recentEnd <= recentStart
    || recentEnd - recentStart !== priorEnd - priorStart) return null;
  const valid = (count: number, population: number) => Number.isInteger(count) && count >= 0
    && Number.isInteger(population) && population > 0 && count <= population;
  if (!valid(card.recentDeckCount, periods.recent.decks) || !valid(card.priorDeckCount, periods.prior.decks)) return null;
  const recent = card.recentDeckCount / periods.recent.decks;
  const prior = card.priorDeckCount / periods.prior.decks;
  return { recent, prior, change: recent - prior };
}
