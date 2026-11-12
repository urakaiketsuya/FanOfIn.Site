import { useMemo } from 'react';
import { computeRaiDamageReport, compareRaiDamageReports, RAI_DAMAGE_CARDS, type AnalyticsDeck, type Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import AssociatedCards from '../../components/AssociatedCards';

type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
const supported = (name: string) => RAI_DAMAGE_CARDS.some(card => card === name);
const relevant = (deck: AnalyticsDeck) => deck.material.some(line => line.quantity > 0 && line.name.startsWith('Rai,')) && deck.main.some(line => line.quantity > 0 && supported(line.name));
const copies = (deck: AnalyticsDeck, name: string) => deck.main.filter(line => line.name === name).reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
const range = (value: { low: number; high: number }) => `${value.low}–${value.high}`;

export default function RaiDamageReport({ deck, cardsByName }: Props) {
  const report = useMemo(() => relevant(deck) ? computeRaiDamageReport(deck, cardsByName) : null, [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="RaiDamageReport">
    <h3 className="text-sm font-semibold">Paid damage · shown cards</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Unbuffed target · going first · middle 80%</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai lineage'}</p> : <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="w-full max-w-80"><AssociatedCards cardsByName={cardsByName} label="Paid damage cards" lines={deck.main.filter(line => supported(line.name))} /></div>
      <div className="grid gap-3 sm:grid-cols-2">{report.points.filter(point => point.turn === 3 || point.turn === 5).map(point => <section key={point.turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h4 className="font-semibold">By turn {point.turn}</h4>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{range(point.damage)} <span className="text-sm font-normal">damage</span></p>
        <p className="text-xs text-ctp-subtext1">{point.damage.median} median</p>
      </section>)}</div>
    </div>}
  </Panel>;
}

export function RaiDamageComparison({ baseline, target, cardsByName, baselineLabel, targetLabel }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string;
}) {
  const report = useMemo(() => relevant(baseline) || relevant(target) ? compareRaiDamageReports(baseline, target, cardsByName) : null, [baseline, target, cardsByName]);
  if (!report) return null;
  return <section data-component="RaiDamageComparison" className="mt-4">
    <h4 className="font-semibold">Paid damage · shown cards</h4>
    <p className="mt-1 break-words text-xs text-ctp-subtext1">{baselineLabel} → {targetLabel}</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires both supported Rai lineages'}</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Unbuffed target · going first · middle 80%</p>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="w-full max-w-80"><AssociatedCards cardsByName={cardsByName} label="Compared paid damage cards" lines={RAI_DAMAGE_CARDS.map(name => ({ name, quantity: Math.max(copies(baseline, name), copies(target, name)), detail: `${copies(baseline, name)} → ${copies(target, name)}` }))} /></div>
        <div className="grid gap-3 sm:grid-cols-2">{report.points.map(point => <section key={point.turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
          <h5 className="font-semibold">By turn {point.turn}</h5>
          <p className="mt-2 text-xl font-semibold tabular-nums">{range(point.before)} → {range(point.after)}</p>
          <p className="text-xs text-ctp-subtext1">Damage · {point.after.median - point.before.median > 0 ? '+' : ''}{point.after.median - point.before.median} median</p>
        </section>)}</div>
      </div>
    </>}
  </section>;
}
