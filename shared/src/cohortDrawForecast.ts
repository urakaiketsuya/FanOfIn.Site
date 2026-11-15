import type { Card } from './api-types.js';
import type { AnalyticsDeck } from './fixtureResources.js';
import { computeRaiDrawReport } from './raiDrawComparison.js';
import { computeTonorisDrawReport } from './tonorisDrawReport.js';
import { cardAccess } from './cardAccess.js';

export const COHORT_TURN_CHECKPOINTS = [1, 2, 3, 4, 5] as const;

/** Exact natural access plus paired, card-specific gains from the existing paid policy. */
export function cohortDeckDrawForecast(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const size = deck.main.reduce((sum, line) => sum + line.quantity, 0);
  if (!size) return null;
  if ([...deck.main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return null;
  const quantities = new Map<string, number>();
  for (const line of deck.main) quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity);
  const rai = computeRaiDrawReport(deck, catalog);
  const gains = COHORT_TURN_CHECKPOINTS.map(() => new Map<string, number>());
  const tonoris = rai?.status === 'ready' ? null : computeTonorisDrawReport(deck, catalog, 1024, state => {
    const natural = new Set(state.naturalSeenNames);
    for (const name of state.seenNames) if (!natural.has(name)) {
      const gain = gains[state.turn - 1];
      gain.set(name, (gain.get(name) ?? 0) + 1 / 1024);
    }
  });
  if (rai?.status !== 'ready' && (!tonoris || tonoris.missing.length)) return null;
  return COHORT_TURN_CHECKPOINTS.map((turn, i) => ({
    turn,
    seen: rai?.status === 'ready' ? rai.points[i].seenRange : tonoris!.points[i].seen,
    cards: new Map([...quantities].map(([name, quantity]) => {
      const natural = cardAccess(size, quantity, Math.min(size, 6 + turn)).access;
      const gain = rai?.status === 'ready' ? rai.points[i].extraAccess.get(name) ?? 0 : gains[i].get(name) ?? 0;
      return [name, { natural, modeled: Math.min(1, natural + gain) }];
    })),
  }));
}
