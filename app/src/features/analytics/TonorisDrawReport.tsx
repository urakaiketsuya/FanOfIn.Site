import { useMemo } from 'react';
import { computeTonorisDrawReport, type AnalyticsDeck, type Card, type DrawRange } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import AssociatedCards from '../../components/AssociatedCards';
const span = (value: DrawRange) => `${value.low}–${value.high}`;
export default function TonorisDrawReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeTonorisDrawReport(deck, cardsByName), [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="TonorisDrawReport">
    <h3 className="text-sm font-semibold">Draw & payment forecast</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Unopposed draw sequence · going first · middle 80% of samples</p>
    {report.missing.length > 0 ? <p role="status" className="mt-3 text-sm">Card data incomplete</p> : <>
      <div className="my-4 grid gap-3 sm:grid-cols-2">{report.points.filter(point => point.turn === 3 || point.turn === 5).map(point => <section key={point.turn} className="rounded-xl bg-ctp-mantle p-3">
        <h4 className="font-semibold">Turn {point.turn}</h4>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{span(point.seen)} <span className="text-sm font-normal">cards seen</span></p>
        <p className="text-xs text-ctp-subtext1">{point.seen.median} median · {point.natural} natural draws</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-2"><dt>Extra cards</dt><dd>{span(point.extra)}</dd></div>
          <div className="flex justify-between gap-2"><dt>Memory cost saved</dt><dd>{span(point.saved)}</dd></div>
          <div className="flex justify-between gap-2"><dt>Level 3 reached</dt><dd>{Math.round(point.level3 * 100)}%</dd></div>
          <div className="flex justify-between gap-2"><dt>Drones fabricated</dt><dd>{span(point.fabricated)}</dd></div>
          <div className="flex justify-between gap-2"><dt>Titans summoned</dt><dd>{span(point.titans)}</dd></div>
          <div className="flex justify-between gap-2"><dt>Neos bonus drawn</dt><dd>{Math.round(point.bonus * 100)}%</dd></div>
        </dl>
      </section>)}</div>
      <AssociatedCards cardsByName={cardsByName} label="Draw and payment sources" lines={report.sources.map(source => ({ ...source, detail: `${Math.round((report.points[4].plays.find(play => play.name === source.name)?.probability ?? 0) * 100)}% played by turn 5` }))} />
    </>}
  </Panel>;
}
