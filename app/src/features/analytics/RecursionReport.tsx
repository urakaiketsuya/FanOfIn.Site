import { rangeText } from './reportFormatting';
import { useMemo } from 'react';
import { computeRecursionReport, compareRecursionReports, hasRecursionSources, type AnalyticsDeck, type Card } from '@gatcg/shared';
import ForecastResult, { ForecastChance, ReportCards } from './ForecastResult';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

const percent = (value: number) => `${Math.round(value * 100)}%`;
const issue = (status: string) => status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai lineage';
const metrics = [{ key: 'returned', label: 'Cards returned' }, { key: 'replayed', label: 'Returned cards replayed' }] as const;
type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
export default function RecursionReport({ deck, cardsByName }: Props) {
  const report = useMemo(() => hasRecursionSources(deck) ? computeRecursionReport(deck, cardsByName) : null, [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="RecursionReport"><h3 className="mb-1 text-lg font-semibold">Graveyard reuse</h3><p className="mb-5 text-xs text-ctp-subtext1">Going first · cumulative</p>
    {report.status !== 'ready' ? <p role="status">{issue(report.status)}</p> : <>
      {metrics.map(metric => <ForecastResult key={metric.key} title={metric.label} cards={report.sources} cardsByName={cardsByName}>
        <ForecastChance early={report.points[2][metric.key].ready} late={report.points[4][metric.key].ready} label={`1+ ${metric.key === 'returned' ? 'returned' : 'replayed'}`} />
        <p className="mt-4 text-sm tabular-nums">{rangeText(report.points[4][metric.key])} cards</p><p className="text-xs text-ctp-subtext1">By turn 5 · middle 80% · {report.points[4][metric.key].median} median</p>
      </ForecastResult>)}
      {report.points[4].targets.length > 0 && <section className="mt-5 border-t border-ctp-surface1 pt-5"><h4 className="mb-3 font-semibold">Returned cards</h4><ReportCards lines={report.points[4].targets.map(name => ({ name, quantity: deck.main.filter(line => line.name === name).reduce((n, line) => n + line.quantity, 0) }))} cardsByName={cardsByName} /></section>}
    </>}
  </Panel>;
}
export function RecursionComparison({ baseline, target, cardsByName }: { baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => hasRecursionSources(baseline) || hasRecursionSources(target) ? compareRecursionReports(baseline, target, cardsByName) : null, [baseline, target, cardsByName]);
  if (!report) return null;
  return <section data-component="RecursionComparison" className="mt-4"><h4 className="font-semibold">Graveyard reuse</h4><p className="mt-1 text-xs text-ctp-subtext1">Going first · cumulative · middle 80%</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{issue(report.status)}</p> : <>
      <div className="my-3 grid gap-3 sm:grid-cols-2">{metrics.map(metric => <section key={metric.key} className="min-w-0 rounded-xl bg-ctp-mantle p-3"><h5 className="text-sm font-semibold">{metric.label}</h5><div className="mt-3 grid grid-cols-2 gap-3">{report.points.map(point => <div key={point.turn}><p className="text-xs font-semibold">By turn {point.turn}</p>
        <p className="mt-1 font-semibold tabular-nums">{percent(point.before[metric.key].ready)} → {percent(point.after[metric.key].ready)}</p><p className="text-xs text-ctp-subtext1">1+ {metric.key === 'returned' ? 'returned' : 'replayed'}</p>
        <p className="mt-2 text-xs tabular-nums">{point.before[metric.key].low}–{point.before[metric.key].high} → {point.after[metric.key].low}–{point.after[metric.key].high} cards</p>
      </div>)}</div></section>)}</div>
      <AssociatedCards lines={report.sources.map(line => { const copies = (deck: AnalyticsDeck) => deck.main.filter(card => card.name === line.name).reduce((n, card) => n + card.quantity, 0); return { name: line.name, quantity: Math.max(copies(baseline), copies(target)), detail: `${copies(baseline)} → ${copies(target)}` }; })} cardsByName={cardsByName} label="Compared recovery cards" />
    </>}
  </section>;
}
