import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { aggregateFieldHistory, fieldWindowStart, laterFieldBounds, scoreExpectedField, auditFieldWindows, type FieldHistoryData } from '@gatcg/shared';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';

const root = new URL('../../', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/analysis/field-history.json', root), 'utf8')) as FieldHistoryData;
const report = JSON.parse(await readFile(new URL('docs/reports/field-window-audit.json', root), 'utf8')) as {
  minMatchups: number; audits: ReturnType<typeof auditFieldWindows>[];
};
assert.equal(report.minMatchups, data.minMatchups, 'Audit threshold differs from history');
const diagnostics = report.audits.map(audit => {
  assert.deepEqual(auditFieldWindows(data.events, audit.format, audit.from, audit.to, data.minMatchups, audit.holdoutDays), audit, 'Audit differs from current history; regenerate audit');
  const population = data.events.filter(event => event.format === audit.format);
  const cases = audit.windows.flatMap(window => {
    const to = fieldWindowStart(window.from, 2), from = fieldWindowStart(to, audit.trainingDays);
    const prior = population.filter(event => event.date >= from && event.date <= to && event.completedDate !== null && event.completedDate < window.from);
    const training = aggregateFieldHistory(prior, { format: audit.format, from, to }, data.minMatchups);
    const laterEvents = population.filter(event => window.eventIds.includes(event.id));
    assert.equal(laterEvents.length, window.eventIds.length, 'Audit event missing from history');
    const target = { id: -1, date: window.from, completedDate: window.to, format: audit.format, champions: [], battleChart: laterEvents.flatMap(event => event.battleChart) };
    const total = training.champions.reduce((sum, row) => sum + row.weight, 0);
    return window.details.filter(row => row.classification === 'outside').map(row => {
      const later = laterFieldBounds(row.champion, training.champions, target)!;
      // Fail on stale inputs instead of attributing an audit to different later outcomes.
      for (const [actual, expected] of [[later.lower, row.laterLower], [later.upper, row.laterUpper], [later.games, row.laterGames]]) assert.ok(Math.abs(actual - expected) < 1e-10, 'Audit outcomes differ from history; regenerate audit');
      const direction = later.lower > row.predictedUpper ? 'above' : 'below';
      const opponents = training.champions.map(({ champion: opponent, weight }) => {
        const field = [{ champion: opponent, weight: 1 }];
        const earlier = scoreExpectedField([row.champion], field, training.battleChart)[0];
        const observed = laterFieldBounds(row.champion, field, target)!;
        const share = weight / total;
        const known = earlier.coverage === 1 && observed.coverage === 1;
        return { opponent, share, trainingGames: earlier.games, laterGames: observed.games,
          trainingLower: earlier.lower, trainingUpper: earlier.upper, laterLower: observed.lower, laterUpper: observed.upper,
          // This compares the point estimate to later raw results; it does not decompose bootstrap quantiles.
          weightedChange: known ? share * (observed.lower - earlier.lower) : null };
      }).sort((a, b) => Math.abs(b.weightedChange ?? 0) - Math.abs(a.weightedChange ?? 0) || a.opponent.localeCompare(b.opponent));
      assert.ok(Math.abs(opponents.reduce((sum, opponent) => sum + opponent.share * opponent.laterLower, 0) - later.lower) < 1e-10);
      assert.ok(Math.abs(opponents.reduce((sum, opponent) => sum + opponent.share * opponent.laterUpper, 0) - later.upper) < 1e-10);
      return { from: window.from, to: window.to, ...row, direction,
        gap: direction === 'above' ? later.lower - row.predictedUpper : row.predictedLower - later.upper,
        trainingEvents: prior.length, laterEvents: laterEvents.length, opponents };
    });
  }).sort((a, b) => b.gap - a.gap || a.from.localeCompare(b.from) || a.champion.localeCompare(b.champion));
  assert.equal(cases.length, audit.outside);
  return { format: audit.format, outside: cases.length, above: cases.filter(row => row.direction === 'above').length,
    below: cases.filter(row => row.direction === 'below').length, cases };
});
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/field-range-diagnostics.json', root)), {
  sourceGeneratedAt: data.generatedAt,
  interpretation: 'Descriptive attribution only. Weighted changes compare shrunken training point scores with raw later scores on jointly observed opponents. They do not decompose bootstrap endpoints or distinguish temporal change from finite-match noise. Unknown opponents retain bounds and null changes.',
  diagnostics,
}, 2);
for (const { cases, ...summary } of diagnostics) console.log(JSON.stringify({ ...summary, largestGaps: cases.slice(0, 5).map(row => ({ champion: row.champion, from: row.from, gap: row.gap, laterGames: row.laterGames, leadingOpponent: row.opponents[0] })) }));
