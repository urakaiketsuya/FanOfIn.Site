import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { auditFieldRanges, auditFieldWindows, fieldWindowStart, FIELD_RESAMPLES, type FieldHistoryData } from '@gatcg/shared';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
const root = new URL('../../', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/analysis/field-history.json', root), 'utf8')) as FieldHistoryData;
const audits = [...new Set(data.events.map(event => event.format))].sort().map(format => {
  const audit = auditFieldRanges(data.events, format, data.minMatchups);
  const { details: _details, ...summary } = audit;
  console.log(JSON.stringify(summary));
  return audit;
});
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/field-range-audit.json', root)), {
  sourceGeneratedAt: data.generatedAt,
  minMatchups: data.minMatchups,
  resamples: FIELD_RESAMPLES,
  interpretation: 'Compatibility with later field-standardized finite-match results, not calibrated confidence coverage. Missing later matchups retain bounds; partial overlap is inconclusive.',
  audits,
}, 2);

const windowAudits = [...new Set(data.events.map(event => event.format))].sort().map(format => {
  const to = data.events.filter(event => event.format === format).map(event => event.date).sort().at(-1)!;
  const audit = auditFieldWindows(data.events, format, fieldWindowStart(to, 336), to, data.minMatchups);
  const { windows: _windows, ...summary } = audit;
  console.log(JSON.stringify(summary));
  return audit;
});
await writeJsonAtomic(fileURLToPath(new URL('docs/reports/field-window-audit.json', root)), {
  sourceGeneratedAt: data.generatedAt, minMatchups: data.minMatchups, resamples: FIELD_RESAMPLES,
  interpretation: 'Twelve non-overlapping 28-day holdouts with fixed prior fields. Later events must finish within their window. Compatibility with noisy outcomes, not calibrated confidence coverage.',
  audits: windowAudits,
}, 2);
