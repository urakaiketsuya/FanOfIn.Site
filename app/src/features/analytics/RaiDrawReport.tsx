import { useMemo } from 'react';
import { computeRaiDrawReport, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

export default function RaiDrawReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeRaiDrawReport(deck, cardsByName), [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="RaiDrawReport"><h3 className="text-sm font-semibold">Rai draw forecast</h3><p className="mt-1 text-xs text-ctp-subtext1">Unopposed · going first · middle 80%</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai lineage'}</p> : <>
      <div className="my-4 grid gap-3 sm:grid-cols-2">{[3, 5].map(turn => { const point = report.points[turn - 1]; return <section key={turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3"><h4 className="font-semibold">Turn {turn}</h4><p className="mt-2 text-2xl font-semibold tabular-nums">{point.seenRange.low}–{point.seenRange.high} <span className="text-sm font-normal">cards seen</span></p><p className="text-xs text-ctp-subtext1">{point.seenRange.median} median</p><dl className="mt-3 space-y-2 text-sm">{(['hand', 'memory'] as const).map(zone => <div key={zone} className="flex flex-wrap justify-between gap-2"><dt>{zone === 'hand' ? 'Hand' : 'Memory'} · avg.</dt><dd>{point[zone].toFixed(1)}</dd></div>)}</dl></section>; })}</div>
      <AssociatedCards lines={report.sources} cardsByName={cardsByName} label="Rai draw sources" />
    </>}
  </Panel>;
}
