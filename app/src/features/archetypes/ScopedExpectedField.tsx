import { useMemo, useState, useTransition } from 'react';
import { aggregateFieldHistory, fieldWindowStart, type FieldHistoryData } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import ExpectedField from './ExpectedField';
import FieldEquilibrium from './FieldEquilibrium';

const control = 'mt-1 min-h-control w-full min-w-0 rounded border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue';

export default function ScopedExpectedField({ enabled }: { enabled: boolean }) {
  const [visited, setVisited] = useState(enabled);
  if (enabled && !visited) setVisited(true);
  const data = usePublishedData<FieldHistoryData>('analysis-field-history', '/data/analysis/field-history.json', enabled || visited);
  const status = usePublishedDataStatus('analysis-field-history', '/data/analysis/field-history.json', enabled || visited);
  const [formatDraft, setFormat] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, { from: string; to: string }>>({});
  const [pending, startTransition] = useTransition();
  const formats = useMemo(() => [...new Set(data?.events.map(event => event.format) ?? [])].sort(), [data]);
  const format = formatDraft ?? (formats.includes('standard') ? 'standard' : formats[0] ?? 'standard');
  const latest = useMemo(() => data?.events.filter(event => event.format === format).map(event => event.date).sort().at(-1) ?? '', [data, format]);
  const scope = useMemo(() => ({ format, ...(dates[format] ?? { from: latest ? fieldWindowStart(latest) : '', to: latest }) }), [dates, format, latest]);
  const invalid = !scope.from || !scope.to || scope.from > scope.to;
  const selectedEvents = useMemo(() => data?.events.filter(event => event.format === scope.format && event.date >= scope.from && event.date <= scope.to) ?? [], [data, scope]);
  const projection = useMemo(() => aggregateFieldHistory(data?.events ?? [], scope, data?.minMatchups), [data, scope]);
  const backtest = data?.backtests.find(test => test.format === format);
  const rangeCheck = data?.rangeChecks?.find(check => check.format === format);
  const label = format === 'standard' ? 'Standard' : format === 'team-standard-3v3' ? 'Team Standard (3v3)' : format;

  if (!data) return <div className="mt-6" role="status">{status.phase === 'error' ? <>{status.error} <Button onClick={status.retry}>Retry field history</Button></> : 'Loading field history…'}</div>;
  if (!data.events.length) return <p className="mt-6">No completed events with public Champion decks yet.</p>;
  return <div className="mt-6 space-y-4">
    {status.phase === 'error' && <p role="alert">{status.error} Showing cached history. <Button onClick={status.retry}>Retry field history</Button></p>}
    <ExpectedField events={selectedEvents} minMatchups={data.minMatchups} defaults={projection.champions} battleChart={projection.battleChart} generatedAt={data.generatedAt} scopeKey={JSON.stringify(scope)} description={`${label} · ${scope.from} to ${scope.to} · public deck shares`} scopeValid={!invalid} scopeControls={
      <Panel id="field-scope" className="scroll-mt-24" aria-busy={pending}>
        <h2 className="mb-3 font-semibold">Event scope</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="min-w-0 text-sm">Format<select aria-label="Field format" className={control} value={format} onChange={event => startTransition(() => setFormat(event.target.value))}>{formats.map(value => <option key={value} value={value}>{value === 'standard' ? 'Standard' : value === 'team-standard-3v3' ? 'Team Standard (3v3)' : value}</option>)}</select></label>
      <label className="min-w-0 text-sm">From<input type="date" aria-label="Field start date" className={control} value={scope.from} onInput={event => { const from = event.currentTarget.value; startTransition(() => setDates(previous => ({ ...previous, [format]: { from, to: previous[format]?.to ?? scope.to } }))); }} /></label>
      <label className="min-w-0 text-sm">Through<input type="date" aria-label="Field end date" className={control} value={scope.to} aria-invalid={invalid} onInput={event => { const to = event.currentTarget.value; startTransition(() => setDates(previous => ({ ...previous, [format]: { from: previous[format]?.from ?? scope.from, to } }))); }} /></label>
    </div>
    <p role="status" className="text-sm text-ctp-subtext1">{pending ? 'Recalculating scope…' : invalid ? 'Choose a start date on or before the end date.' : `${projection.events} events · ${scope.from} to ${scope.to}`}</p>
      </Panel>
    } />
    <FieldEquilibrium field={projection.champions} chart={projection.battleChart} valid={!invalid} description={`${label} · ${scope.from} to ${scope.to}`} />
    <Panel>
      <h2 className="font-semibold">Event range check · {label}</h2>
      {rangeCheck && rangeCheck.evaluated > 0 ? <>
        <p className="mt-1 text-sm text-ctp-subtext1">{rangeCheck.from} to {rangeCheck.to} · {rangeCheck.holdoutDays}-day test windows</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[['Inside range', rangeCheck.inside], ['Outside range', rangeCheck.outside], ['Inconclusive', rangeCheck.inconclusive]].map(([name, count]) => <div key={name} className="rounded-lg bg-ctp-base p-3">
            <dt className="text-sm text-ctp-subtext1">{name}</dt><dd className="text-2xl font-semibold tabular-nums">{count.toLocaleString()}</dd>
          </div>)}
        </dl>
        <p className="mt-2 text-sm text-ctp-subtext1">{rangeCheck.evaluated} Champion/window comparisons · {((rangeCheck.meanLaterCoverage ?? 0) * 100).toFixed(1)}% average later field coverage · {rangeCheck.skipped} skipped</p>
        <p className="mt-1 text-xs text-ctp-subtext0">Later results compared with event-resampling ranges. Confidence calibration remains unproven.</p>
        <p className="mt-1 text-xs text-ctp-subtext0">Published field mixes; independent of your dates, weights, and stress test.</p>
      </> : <p className="mt-2 text-sm text-ctp-subtext1">{rangeCheck ? 'Not enough later matchup evidence to check event ranges.' : 'Event range checks are not available in this published dataset yet.'}</p>}
    </Panel>
    {backtest && <Panel>
      <h2 className="font-semibold">Covered-matchup check · {label}</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Previous {backtest.windowDays} days per event · published shares · all available test dates</p>
      {backtest.evaluated > 0 ? <>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><p className="text-sm text-ctp-subtext1">Field score error</p><p className="text-xl font-semibold">{(backtest.expectedFieldMae! * 100).toFixed(1)} pp</p></div>
          <div><p className="text-sm text-ctp-subtext1">Historical score error</p><p className="text-xl font-semibold">{(backtest.historicalMae! * 100).toFixed(1)} pp</p></div>
        </div>
        <p className="mt-2 text-xs text-ctp-subtext0">Lower is better · {((backtest.meanFieldCoverage ?? 0) * 100).toFixed(1)}% mean field coverage · {backtest.evaluated.toLocaleString()} Champion/event comparisons across {backtest.testedEvents} events · {backtest.skipped.toLocaleString()} skipped for incomplete evidence · {backtest.excludedOutcomes.toLocaleString()} unsupported player-match outcomes excluded</p>
      </> : <p className="mt-2 text-sm text-ctp-subtext1">Not enough earlier matchup coverage to compare predictions.</p>}
    </Panel>}
  </div>;
}
