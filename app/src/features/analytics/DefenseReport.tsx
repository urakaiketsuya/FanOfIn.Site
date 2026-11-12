import { useMemo } from 'react';
import { computeDefenseReport, compareDefenseReports, hasDefenseSources, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
const turns = [3, 5];
const percent = (value: number) => `${Math.round(value * 100)}%`;
function Result({ value, ready }: { value: { low: number; median: number; high: number }; ready: number }) {
  return <><p className="text-lg font-semibold tabular-nums">{percent(ready)} <span className="text-xs font-normal text-ctp-subtext1">ready</span></p>
    <p className="text-sm tabular-nums">{value.low}–{value.high} <span className="text-xs text-ctp-subtext1">· {value.median} median</span></p>
    <svg viewBox="0 0 100 12" className="mt-1 w-full" aria-hidden="true"><line x1="5" x2="95" y1="6" y2="6" className="stroke-ctp-surface1" /><line x1={5 + value.low * 10} x2={5 + value.high * 10} y1="6" y2="6" strokeWidth="3" className="stroke-ctp-teal" /><circle cx={5 + value.median * 10} cy="6" r="3" className="fill-ctp-text" /></svg>
  </>;
}
const issue = (status: string) => status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai, Tonoris or Diao Chan lineage';
export default function DefenseReport({ deck, cardsByName }: Props) {
  const report = useMemo(() => hasDefenseSources(deck) ? computeDefenseReport(deck, cardsByName) : null, [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="DefenseReport"><h3 className="text-sm font-semibold">Defense ready</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Going first · middle 80% · one response window</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{issue(report.status)}</p> : <div className="mt-4 grid gap-4 lg:grid-cols-3">{report.scenarios.filter(scenario => scenario.cards.length > 0).map(scenario => {
      const names = new Set([...scenario.cards.map(line => line.name), ...scenario.points.flatMap(point => point.sources)]);
      const lines = [...names].map(name => ({ name, quantity: deck.main.filter(line => line.name === name).reduce((n, line) => n + line.quantity, 0) || 1 }));
      return <section key={scenario.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3"><h4 className="text-sm font-semibold">{scenario.metric === 'prevention' ? 'Prevention capacity' : 'Recovery capacity'}</h4>
        <p className="mt-1 text-xs text-ctp-subtext1">{scenario.label}</p>
        <div className="my-3 grid grid-cols-2 gap-4">{scenario.points.filter(point => turns.includes(point.turn)).map(point => <div key={point.turn}><h5 className="mb-1 text-xs font-semibold">Turn {point.turn}</h5><Result value={point.range} ready={point.ready} /></div>)}</div>
        <AssociatedCards lines={lines} cardsByName={cardsByName} label={`${scenario.label} defense cards`} />
      </section>;
    })}</div>}
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
