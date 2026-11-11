import { useMemo } from 'react';
import { compareTonorisDrawReports, type AnalyticsDeck, type Card, type DrawRange } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
const span = (value: DrawRange) => `${value.low}–${value.high}`;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}`;
export default function TonorisDrawComparison({ baseline, target, cardsByName, baselineLabel, targetLabel }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string;
}) {
  const report = useMemo(() => compareTonorisDrawReports(baseline, target, cardsByName), [baseline, target, cardsByName]);
  if (!report) return null;
  return <section data-component="TonorisDrawComparison" className="mt-4">
    <h4 className="font-semibold">Draw, payment & token changes</h4>
    <p className="mt-1 break-words text-xs text-ctp-subtext1">{baselineLabel} → {targetLabel}</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Tonoris forecast requires both lineages'}</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Unopposed · going first · middle 80%</p>
      <div className="my-4 grid gap-3 sm:grid-cols-2">{report.points.map(point => <section key={point.turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h5 className="font-semibold">Turn {point.turn}</h5>
        <p className="mt-2 text-xl font-semibold tabular-nums">{span(point.before.seen)} → {span(point.after.seen)}</p>
        <p className="text-xs text-ctp-subtext1">Cards seen · {signed(point.medianSeenDelta)} median</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt>Level 3</dt><dd>{percent(point.before.level3)} → {percent(point.after.level3)} <span className="text-xs">({signed(point.level3Delta)} pp)</span></dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Neos bonus drawn</dt><dd>{percent(point.before.bonus)} → {percent(point.after.bonus)} <span className="text-xs">({signed(point.bonusDelta)} pp)</span></dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Memory saved</dt><dd>{span(point.before.saved)} → {span(point.after.saved)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Drones fabricated</dt><dd>{span(point.before.fabricated)} → {span(point.after.fabricated)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Weapons summoned</dt><dd>{span(point.before.weapons)} → {span(point.after.weapons)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>2 prevention ready</dt><dd>{percent(point.before.preventionReady)} → {percent(point.after.preventionReady)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Token power · after payments</dt><dd>{span(point.before.readyTokenPower)} → {span(point.after.readyTokenPower)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Titans summoned</dt><dd>{span(point.before.titans)} → {span(point.after.titans)}</dd></div>
        </dl>
      </section>)}</div>
      <AssociatedCards cardsByName={cardsByName} label="Compared draw and payment sources" lines={report.sources.map(source => ({
        name: source.name, quantity: Math.max(source.before, source.after),
        detail: `${source.before} → ${source.after} copies · ${percent(source.beforePlayed)} → ${percent(source.afterPlayed)} played by turn 5`,
      }))} />
    </>}
  </section>;
}
