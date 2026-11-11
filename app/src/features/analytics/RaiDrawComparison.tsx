import { useMemo } from 'react';
import { compareRaiDrawReports, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';

export default function RaiDrawComparison({ baseline, target, cardsByName, baselineLabel, targetLabel }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string;
}) {
  const report = useMemo(() => compareRaiDrawReports(baseline, target, cardsByName), [baseline, target, cardsByName]);
  if (!report) return null;
  return <section data-component="RaiDrawComparison" className="mt-4">
    <h4 className="font-semibold">Rai draw forecast</h4>
    <p className="mt-1 break-words text-xs text-ctp-subtext1">{baselineLabel} → {targetLabel}</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Rai forecast requires both supported lineages'}</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Unopposed · going first · middle 80%</p>
      <div className="my-4 grid gap-3 sm:grid-cols-2">{report.points.map(point => <section key={point.turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h5 className="font-semibold">Turn {point.turn}</h5>
        <p className="mt-2 text-xl font-semibold tabular-nums">{point.before.seenRange.low}–{point.before.seenRange.high} → {point.after.seenRange.low}–{point.after.seenRange.high}</p>
        <p className="text-xs text-ctp-subtext1">Cards seen · {point.medianDelta > 0 ? '+' : ''}{point.medianDelta} median</p>
        <dl className="mt-3 space-y-2 text-sm">{(['hand', 'memory'] as const).map(zone => <div key={zone} className="flex flex-wrap justify-between gap-2"><dt>{zone === 'hand' ? 'Hand' : 'Memory'} · avg.</dt><dd>{point.before[zone].toFixed(1)} → {point.after[zone].toFixed(1)}</dd></div>)}</dl>
      </section>)}</div>
      <AssociatedCards cardsByName={cardsByName} label="Compared Rai draw sources" lines={report.sources.map(source => ({
        name: source.name, quantity: Math.max(source.before, source.after), detail: `${source.before} → ${source.after}`,
      }))} />
    </>}
  </section>;
}
