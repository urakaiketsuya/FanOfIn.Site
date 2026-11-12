import { createHash } from 'node:crypto';
import { competitionMatches } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import { chronologicalSplit, evaluatePerformance, type PerformanceRow } from './performanceValidation.js';

export interface HistoricalMatch { id: string; event: string; date: string; a: string; b: string; score: number }

/** Existing shared result validation removes byes, incomplete results and duplicate pairing IDs. */
export function collectHistoricalMatches(bundles: OmnidexEventBundle[]) {
  const matches: HistoricalMatch[] = [];
  const coverage = { completedEvents: 0, eventsWithMatches: 0, savedRoundResponses: 0, unavailableRoundResponses: 0, rawPairings: 0, singleSidePairings: 0, validMatches: 0, invalidPlayerMatches: 0 };
  for (const bundle of bundles) {
    if (bundle.event.status !== 'complete' || !Number.isFinite(Date.parse(bundle.event.date))) continue;
    coverage.completedEvents++;
    for (const round of bundle.pairingsByRound) {
      if ('error' in round) { coverage.unavailableRoundResponses++; continue; }
      coverage.savedRoundResponses++;
      coverage.rawPairings += round.pairings.length;
      coverage.singleSidePairings += round.pairings.filter(p => p.pairing.length === 1).length;
    }
    let count = 0;
    for (const [index, match] of competitionMatches(bundle.pairingsByRound).entries()) {
      if (![match.a, match.b].every(id => Number.isSafeInteger(id) && id > 0)) { coverage.invalidPlayerMatches++; continue; }
      const id = `${bundle.id}:${index}`;
      // One observation per match, orientation chosen independently of its outcome.
      const reverse = createHash('sha256').update(id).digest()[0] % 2 === 1;
      const a = reverse ? match.b : match.a, b = reverse ? match.a : match.b;
      matches.push({ id, event: String(bundle.id), date: new Date(bundle.event.date).toISOString().slice(0, 10), a: String(a), b: String(b), score: match.winner === null ? .5 : Number(match.winner === a) });
      count++;
    }
    if (count) coverage.eventsWithMatches++;
  }
  coverage.validMatches = matches.length;
  return { matches: matches.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), coverage };
}

/** Research Elo: no API Elo deltas or end-of-event standings. Freeze all holdout history. */
export function historicalPredictions(matches: HistoricalMatch[], cutoff: string) {
  const ratings = new Map<string, number>();
  const predictions = new Map<string, { withoutOpponent: number; withOpponent: number; knownA: boolean; knownB: boolean }>();
  const dates = new Map<string, HistoricalMatch[]>();
  for (const match of matches) { const group = dates.get(match.date) ?? []; group.push(match); dates.set(match.date, group); }
  const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
  for (const [date, group] of [...dates].sort(([a], [b]) => a.localeCompare(b))) {
    const deltas = new Map<string, number>();
    for (const match of group) {
      const a = ratings.get(match.a) ?? 1500, b = ratings.get(match.b) ?? 1500;
      const p = expected(a, b);
      predictions.set(match.id, { withoutOpponent: expected(a, 1500), withOpponent: p, knownA: ratings.has(match.a), knownB: ratings.has(match.b) });
      if (date < cutoff) {
        const delta = 20 * (match.score - p);
        deltas.set(match.a, (deltas.get(match.a) ?? 0) + delta);
        deltas.set(match.b, (deltas.get(match.b) ?? 0) - delta);
      }
    }
    // Same-date matches cannot influence one another, including across events.
    for (const [player, delta] of deltas) ratings.set(player, (ratings.get(player) ?? 1500) + delta);
  }
  return predictions;
}

export function evaluateOpponentPerformance(matches: HistoricalMatch[], decks: PerformanceRow[]) {
  const index = new Map(decks.map(deck => [deck.id, deck]));
  const linked: PerformanceRow[] = [];
  for (const match of matches) {
    const a = index.get(`${match.event}:${match.a}`), b = index.get(`${match.event}:${match.b}`);
    if (!a || !b) continue;
    linked.push({ ...a, id: match.id, date: match.date, wins: Number(match.score === 1), losses: Number(match.score === 0), ties: Number(match.score === .5),
      diao: a.diao.map((v, i) => v - b.diao[i]),
      // Keep each side's availability: a missing opponent feature must not erase a known own feature.
      analytics: [...a.analytics, ...b.analytics], identity: `${a.identity}:${b.identity}` });
  }
  if (new Set(linked.map(r => r.date)).size < 3) return { status: 'insufficient-history' as const, linkedMatches: linked.length };
  const { cutoff, train, test } = chronologicalSplit(linked);
  const predictions = historicalPredictions(matches, cutoff);
  const summarize = (key: 'withoutOpponent' | 'withOpponent') => {
    const result = evaluatePerformance(linked, row => predictions.get(row.id)![key]);
    return { cutoff: result.cutoff, trainingMatches: result.trainingDecks, holdout: {
      matches: result.holdout.decks, events: result.holdout.events,
      models: Object.fromEntries(Object.entries(result.holdout.models ?? {}).map(([name, metric]) => [name, {
        meanSquaredMatchPointError: metric.meanSquaredDeckRateError, meanAbsoluteError: metric.meanAbsoluteError,
        improvementOverOwnBaseline95: metric.improvement95,
        calibration: metric.calibration.map(({ decks: count, ...bin }) => ({ ...bin, matches: count })),
      }])),
    } };
  };
  return { status: 'ready' as const, linkedMatches: linked.length, unlinkedMatches: matches.length - linked.length,
    cohortSha256: createHash('sha256').update(JSON.stringify(linked)).digest('hex'),
    historySha256: createHash('sha256').update(JSON.stringify(matches)).digest('hex'),
    trainingMatches: train.length, holdoutMatches: test.length,
    holdoutBothPlayersKnown: test.filter(r => { const p = predictions.get(r.id)!; return p.knownA && p.knownB; }).length,
    withoutOpponent: summarize('withoutOpponent'), withOpponent: summarize('withOpponent') };
}
