import { aggregateFieldHistory, fieldWindowStart, type FieldEvent } from './fieldHistory';
import { resampleExpectedField } from './fieldUncertainty';
import type { FieldWeight } from './expectedField';

/** Raw later match scores standardized to the training field; missing opponents remain [0,1]. */
export function laterFieldBounds(champion: string, field: FieldWeight[], target: FieldEvent) {
  const total = field.reduce((sum, row) => sum + row.weight, 0);
  if (!Number.isFinite(total) || total <= 0 || field.some(row => !Number.isFinite(row.weight) || row.weight < 0)) return null;
  let lower = 0, missing = 0, coverage = 0, games = 0;
  for (const { champion: opponent, weight } of field) {
    if (!weight) continue;
    const share = weight / total;
    if (opponent === champion) { lower += share / 2; coverage += share; continue; }
    let score = 0, count = 0;
    for (const row of target.battleChart) {
      if (!((row.a === champion && row.b === opponent) || (row.b === champion && row.a === opponent))) continue;
      if (row.games <= 0 || ![row.games, row.aWins, row.bWins, row.ties].every(n => Number.isFinite(n) && n >= 0) || row.aWins + row.bWins + row.ties !== row.games) continue;
      score += (row.a === champion ? row.aWins : row.bWins) + row.ties / 2;
      count += row.games;
    }
    if (count) { lower += share * score / count; coverage += share; games += count; }
    else missing += share;
  }
  return { lower, upper: Math.min(1, lower + missing), coverage, games };
}

export function classifyFieldRange(predicted: { lower: number; upper: number }, later: { lower: number; upper: number }) {
  const epsilon = 1e-12;
  if (later.upper < predicted.lower - epsilon || later.lower > predicted.upper + epsilon) return 'outside' as const;
  if (later.lower >= predicted.lower - epsilon && later.upper <= predicted.upper + epsilon) return 'inside' as const;
  return 'inconclusive' as const;
}

/** Compatibility audit, NOT confidence coverage: later finite-match outcomes contain additional noise. */
export function auditFieldRanges(events: FieldEvent[], format: string, minMatchups = 5, maxEvents = 100) {
  if (!Number.isInteger(maxEvents) || maxEvents <= 0) throw new Error('maxEvents must be a positive integer');
  const population = events.filter(e => e.format === format).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (new Set(population.map(e => e.id)).size !== population.length) throw new Error('Duplicate event IDs');
  // Choose targets by date/id only, before inspecting their outcomes.
  const targets = population.slice(-maxEvents);
  const cache = new Map<string, { field: FieldWeight[]; ranges: ReturnType<typeof resampleExpectedField> }>();
  let inside = 0, outside = 0, inconclusive = 0, skipped = 0, widthSum = 0, coverageSum = 0;
  const details: { eventId: number; date: string; champion: string; predictedLower: number; predictedUpper: number; laterLower: number; laterUpper: number; laterCoverage: number; laterGames: number; classification: 'inside' | 'outside' | 'inconclusive' }[] = [];
  for (const target of targets) {
    let training = cache.get(target.date);
    if (!training) {
      const to = fieldWindowStart(target.date, 2), from = fieldWindowStart(to);
      const prior = population.filter(e => e.date >= from && e.date <= to && e.completedDate !== null && e.completedDate < target.date);
      const aggregate = aggregateFieldHistory(prior, { format, from, to }, minMatchups);
      training = { field: aggregate.champions, ranges: resampleExpectedField(aggregate.champions.map(c => c.champion), aggregate.champions, prior, minMatchups) };
      cache.set(target.date, training);
    }
    const ranges = new Map(training.ranges.map(row => [row.champion, row]));
    for (const champion of [...new Set(target.battleChart.flatMap(row => [row.a, row.b]))].sort()) {
      const range = ranges.get(champion);
      const later = laterFieldBounds(champion, training.field, target);
      if (!range || range.lower === null || range.upper === null || !later || !later.games) { skipped++; continue; }
      const classification = classifyFieldRange({ lower: range.lower, upper: range.upper }, later);
      if (classification === 'inside') inside++;
      else if (classification === 'outside') outside++;
      else inconclusive++;
      widthSum += range.upper - range.lower; coverageSum += later.coverage;
      details.push({ eventId: target.id, date: target.date, champion, predictedLower: range.lower, predictedUpper: range.upper, laterLower: later.lower, laterUpper: later.upper, laterCoverage: later.coverage, laterGames: later.games, classification });
    }
  }
  return { format, windowDays: 90, maxEvents, targetEvents: targets.length, from: targets[0]?.date ?? null, to: targets.at(-1)?.date ?? null,
    evaluated: details.length, inside, outside, inconclusive, skipped,
    meanRangeWidth: details.length ? widthSum / details.length : null,
    meanLaterCoverage: details.length ? coverageSum / details.length : null, details };
}
