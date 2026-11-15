import { useEffect, useMemo, useState, useTransition } from 'react';
import { observedMatchupCohort, observedMatchupEvents, emptyMatchupScope, type Card, type ObservedMatchupData, type ObservedMatchupScope } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import type { DeckTestResult } from '../../lib/deckTestResult';
import AnalysisMatchups from './AnalysisMatchups';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

export default function ObservedMatchupReport({ result, loading, cards, preview, scope, onScope, error, onRetry }: {
  result: DeckTestResult | null; loading: boolean; cards: Map<string, Card>; preview?: boolean;
  scope: ObservedMatchupScope; onScope: (scope: ObservedMatchupScope) => void; error?: string | null; onRetry?: () => void;
}) {
  const data = usePublishedData<ObservedMatchupData>('analysis-observed-matchups', '/data/analysis/observed-matchups.json');
  const status = usePublishedDataStatus('analysis-observed-matchups', '/data/analysis/observed-matchups.json');
  const [draft, setDraft] = useState(scope);
  useEffect(() => setDraft(scope), [scope]);
  const [pending, startTransition] = useTransition();
  const cluster = result?.classification.cluster;
  const cohort = useMemo(() => data && cluster ? observedMatchupCohort(data, cluster.id, scope) : undefined, [data, cluster, scope]);
  const events = useMemo(() => data && cluster ? observedMatchupEvents(data, cluster.id, scope) : [], [data, cluster, scope]);
  const scopedResult = useMemo(() => {
    if (!result || !cohort) return result;
    return { ...result, matchups: cohort.matchups.map(row => ({ clusterId: cluster!.id, opponentClusterId: row.id,
      opponentClusterName: data?.builds[row.id]?.name ?? (row.id === cluster!.id ? cluster!.name : 'Build ' + row.id),
      opponentChampionName: data?.builds[row.id]?.champion ?? (row.id === cluster!.id ? cluster!.championName : 'Opponent'),
      games: row.matches, baselineWinRate: row.winRate, myCards: [], opponentCards: [], answers: [] })) };
  }, [result, cohort, cluster, data]);
  if (loading || !cluster) return <AnalysisMatchups result={result} loading={loading} cards={cards} error={error} onRetry={onRetry} preview={preview} />;
  if (!data) return <Panel className="mt-4">{status.error ? <><p role="alert">Observed results could not be loaded.</p><Button className="mt-3" onClick={status.retry}>Retry results</Button></> : <p role="status">Loading observed results…</p>}</Panel>;
  const update = (next: Partial<ObservedMatchupScope>) => {
    const value = { ...draft, ...next };
    setDraft(value);
    startTransition(() => onScope(value));
  };
  const inputClass = 'mt-1 block min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue';
  const invalid = Boolean(scope.from && scope.to && scope.from > scope.to);
  return <div aria-busy={pending}>
    <Panel className="mt-4">
      <h2 className="mb-3 text-sm font-semibold">Matchup filters</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <label className="min-w-0 text-sm">From<input type="date" className={inputClass} value={draft.from} max={draft.to || undefined} onChange={e => update({ from: e.target.value, event: '' })} /></label>
        <label className="min-w-0 text-sm">Through<input type="date" className={inputClass} value={draft.to} min={draft.from || undefined} onChange={e => update({ to: e.target.value, event: '' })} /></label>
        <label className="col-span-2 min-w-0 text-sm sm:col-span-1">Format<select className={inputClass} value={draft.format} onChange={e => update({ format: e.target.value, event: '' })}><option value="">All formats</option>{[...new Set(data.events.map(e => e.format))].sort().map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="col-span-2 min-w-0 text-sm sm:col-span-1">Event<select className={inputClass} value={draft.event} onChange={e => update({ event: e.target.value })}><option value="">All events</option>{events.map(e => <option key={e.id} value={e.id}>{e.date} · {e.name}</option>)}</select></label>
      </div>
      {Object.values(draft).some(Boolean) && <Button className="mt-3" onClick={() => update(emptyMatchupScope)}>Reset filters</Button>}
      {invalid && <p role="alert" className="mt-3 text-sm">Choose an end date on or after the start.</p>}
      {pending && <p role="status" className="mt-3 text-sm">Updating results…</p>}
      {status.error && <div className="mt-3"><p role="alert" className="text-sm">Showing saved results. Update failed.</p><Button onClick={status.retry}>Retry results</Button></div>}
    </Panel>
    {!invalid && <AnalysisMatchups key={`${cluster.id}:${JSON.stringify(scope)}`} result={scopedResult} loading={false} cards={cards} preview={preview} observed={cohort} observedLabel={[scope.from || scope.to ? `${scope.from || 'Start'} – ${scope.to || 'Latest'}` : 'All dates', scope.event ? events.find(e => String(e.id) === scope.event)?.name ?? 'Selected event' : 'All events', scope.format || 'All formats'].join(' · ')} />}
  </div>;
}
