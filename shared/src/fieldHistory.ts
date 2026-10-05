import type { auditFieldWindows } from './fieldCalibration';
import type { BattleChartEntry } from './analysis-types';
import { publishedField, scoreExpectedField, type FieldWeight } from './expectedField';
import { shrinkWinRate } from './winRateShrinkage';

export interface FieldEvent {
  id: number;
  date: string;
  completedDate: string | null;
  format: string;
  champions: FieldWeight[];
  battleChart: BattleChartEntry[];
}
export interface FieldHistoryData {
  generatedAt: string;
  minMatchups: number;
  events: FieldEvent[];
  backtests: FieldBacktest[];
  /** Optional for older published projections. Full audit details stay offline. */
  rangeChecks?: Omit<ReturnType<typeof auditFieldWindows>, 'windows'>[];
}
export interface FieldScope { format: string; from: string; to: string }
export interface FieldBacktest {
  format: string;
  windowDays: number;
  testedEvents: number;
  evaluated: number;
  skipped: number;
  expectedFieldMae: number | null;
  historicalMae: number | null;
  meanFieldCoverage: number | null;
  excludedOutcomes: number;
}

export function fieldWindowStart(day: string, days = 90): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

/** Inclusive event-start dates; formats are never pooled. Threshold is applied after aggregation. */
export function aggregateFieldHistory(events: FieldEvent[], scope: FieldScope, minMatchups = 5) {
  const selected = events.filter(e => e.format === scope.format && e.date >= scope.from && e.date <= scope.to);
  const champions = publishedField(selected.flatMap(e => e.champions.map(c => ({ signature: c.champion, deckCount: c.weight }))));
  champions.sort((a, b) => b.weight - a.weight || a.champion.localeCompare(b.champion));
  const rows = new Map<string, BattleChartEntry>();
  for (const event of selected) for (const entry of event.battleChart) {
    const forward = entry.a <= entry.b;
    const a = forward ? entry.a : entry.b, b = forward ? entry.b : entry.a;
    const key = JSON.stringify([a, b]);
    const row = rows.get(key) ?? { a, b, aWins: 0, bWins: 0, ties: 0, games: 0 };
    row.aWins += forward ? entry.aWins : entry.bWins;
    row.bWins += forward ? entry.bWins : entry.aWins;
    row.ties += entry.ties; row.games += entry.games;
    rows.set(key, row);
  }
  return { champions, battleChart: [...rows.values()].filter(r => r.games >= minMatchups), events: selected.length };
}

/** Walk-forward evaluation conditional on training-supported opponents, equal weight per event/Champion. */
export function backtestFieldHistory(events: FieldEvent[], format: string, minMatchups = 5, windowDays = 90): FieldBacktest {
  let expectedError = 0, historicalError = 0, evaluated = 0, skipped = 0, testedEvents = 0, coverageSum = 0, excludedOutcomes = 0;
  const sameFormat = events.filter(e => e.format === format).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  for (const target of sameFormat) {
    // Excludes same-day evidence and overlapping multi-day events, independent of input order.
    const training = sameFormat.filter(e => e.id !== target.id && e.date < target.date && e.completedDate !== null && e.completedDate < target.date);
    const priorDay = fieldWindowStart(target.date, 2);
    const scope = { format, from: fieldWindowStart(priorDay, windowDays), to: priorDay };
    const aggregate = aggregateFieldHistory(training, scope, minMatchups);
    const predictions = new Map(scoreExpectedField(aggregate.champions.map(c => c.champion), aggregate.champions, aggregate.battleChart).map(r => [r.champion, r]));
    const pastRows = training.filter(e => e.date >= scope.from).flatMap(e => e.battleChart);
    const positiveOpponents = new Set(aggregate.champions.map(c => c.champion));
    const targetChampions = new Set(target.battleChart.flatMap(r => [r.a, r.b]));
    let used = false;
    for (const champion of targetChampions) {
      const prediction = predictions.get(champion);
      const missing = new Set(prediction?.missing ?? []);
      // Eligibility comes entirely from training. Never use target attendance to choose weights.
      const supported = (opponent: string) => !!prediction && positiveOpponents.has(opponent) && !missing.has(opponent);
      const tally = (rows: BattleChartEntry[], countExcluded: boolean) => {
        let score = 0, games = 0;
        for (const row of rows) {
          if (row.a !== champion && row.b !== champion) continue;
          const opponent = row.a === champion ? row.b : row.a;
          const copies = row.a === row.b ? 2 : 1;
          if (!supported(opponent)) { if (countExcluded) excludedOutcomes += row.games * copies; continue; }
          score += row.a === row.b ? row.games : (row.a === champion ? row.aWins : row.bWins) + row.ties / 2;
          games += row.games * copies;
        }
        return { score, games };
      };
      const actual = tally(target.battleChart, true);
      const past = tally(pastRows, false);
      if (!prediction || prediction.coverage <= 0 || !past.games || !actual.games) { skipped++; continue; }
      const outcome = actual.score / actual.games;
      expectedError += Math.abs(prediction.lower / prediction.coverage - outcome);
      historicalError += Math.abs(shrinkWinRate(past.score, past.games, 10).adjustedWinRate - outcome);
      coverageSum += prediction.coverage;
      evaluated++; used = true;
    }
    if (used) testedEvents++;
  }
  return { format, windowDays, testedEvents, evaluated, skipped,
    expectedFieldMae: evaluated ? expectedError / evaluated : null,
    historicalMae: evaluated ? historicalError / evaluated : null,
    meanFieldCoverage: evaluated ? coverageSum / evaluated : null, excludedOutcomes };
}
