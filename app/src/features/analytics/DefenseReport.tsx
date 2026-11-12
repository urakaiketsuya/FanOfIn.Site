import { rangeText } from './reportFormatting';
import { useMemo } from 'react';
import { computeDefenseReport, compareDefenseReports, hasDefenseSources, type AnalyticsDeck, type Card } from '@gatcg/shared';
import ForecastResult, { ForecastChance } from './ForecastResult';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
const percent = (value: number) => `${Math.round(value * 100)}%`;
const issue = (status: string) => status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai, Tonoris or Diao Chan lineage';
export default function DefenseReport({ deck, cardsByName }: Props) {
  const report = useMemo(() => hasDefenseSources(deck) ? computeDefenseReport(deck, cardsByName) : null, [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="DefenseReport"><h3 className="mb-1 text-lg font-semibold">Defense & recovery</h3><p className="mb-5 text-xs text-ctp-subtext1">Going first · one response window</p>
    {report.status !== 'ready' ? <p role="status">{issue(report.status)}</p> : report.scenarios.filter(s => s.cards.length > 0).map(scenario => {
      const names = new Set([...scenario.cards.map(line => line.name), ...scenario.points.flatMap(point => point.sources)]);
      const lines = [...names].map(name => ({ name, quantity: deck.main.filter(line => line.name === name).reduce((n, line) => n + line.quantity, 0) || 1, detail: name === 'Obelisk of Protection' ? 'Generated' : undefined }));
      const early = scenario.points[2], late = scenario.points[4];
      return <ForecastResult key={scenario.id} title={scenario.metric === 'prevention' ? 'Prevention' : 'Recovery'} context={scenario.label} cards={lines} cardsByName={cardsByName}>
        <ForecastChance early={early.ready} late={late.ready} label={scenario.metric === 'prevention' ? '1+ damage prevention ready' : '1+ recovery ready'} cumulative={false} />
        <p className="mt-4 text-sm tabular-nums">{rangeText(late.range)} {scenario.metric === 'prevention' ? 'prevention' : 'recovery'} capacity</p><p className="text-xs text-ctp-subtext1">Turn 5 · middle 80% · {late.range.median} median</p>
      </ForecastResult>;
    })}
  </Panel>;
}

export function DefenseComparison({ baseline, target, cardsByName }: { baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => hasDefenseSources(baseline) || hasDefenseSources(target) ? compareDefenseReports(baseline, target, cardsByName) : null, [baseline, target, cardsByName]);
  if (!report) return null;
  return <section data-component="DefenseComparison" className="mt-4"><h4 className="font-semibold">Defense ready</h4>
    <p className="mt-1 text-xs text-ctp-subtext1">Going first · middle 80% · one response window</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{issue(report.status)}</p> : <div className="mt-3 grid gap-3 lg:grid-cols-3">{report.scenarios.filter(scenario => scenario.cards.length > 0).map(scenario => {
      const names = new Set([...scenario.cards.map(line => line.name), ...scenario.points.flatMap(point => [...point.before.sources, ...point.after.sources])]);
      return <section key={scenario.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3"><h5 className="text-sm font-semibold">{scenario.label}</h5>
        <p className="mt-1 text-xs text-ctp-subtext1">{scenario.metric === 'prevention' ? 'Prevention' : 'Recovery'} capacity</p>
        <div className="my-3 grid grid-cols-2 gap-3">{scenario.points.map(point => <div key={point.turn} className="min-w-0"><p className="text-xs font-semibold">Turn {point.turn}</p><p className="mt-1 text-sm font-semibold tabular-nums">{percent(point.before.ready)} → {percent(point.after.ready)}</p>
          <p className="text-xs tabular-nums"><span className="inline-block">{point.before.range.low}–{point.before.range.high}</span> → <span className="inline-block">{point.after.range.low}–{point.after.range.high}</span></p>
        </div>)}</div>
        <AssociatedCards lines={[...names].map(name => { const copies = (deck: AnalyticsDeck) => deck.main.filter(line => line.name === name).reduce((n, line) => n + line.quantity, 0); return { name, quantity: Math.max(copies(baseline), copies(target)) || 1, detail: name === 'Obelisk of Protection' ? 'Generated' : `${copies(baseline)} → ${copies(target)}` }; })} cardsByName={cardsByName} label={`${scenario.label} compared defense cards`} />
      </section>;
    })}</div>}
  </section>;
}
