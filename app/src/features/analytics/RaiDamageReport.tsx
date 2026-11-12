import { useMemo } from 'react';
import { computeRaiDamageReport, compareRaiDamageReports, RAI_DAMAGE_CARDS, raiDamageScenarioRelevant, type AnalyticsDeck, type Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import AssociatedCards from '../../components/AssociatedCards';

type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
type Range = { low: number; median: number; high: number };
const supported = (name: string) => RAI_DAMAGE_CARDS.some(card => card === name);
const relevant = (deck: AnalyticsDeck) => deck.material.some(line => line.quantity > 0 && line.name.startsWith('Rai,')) && deck.main.some(line => line.quantity > 0 && supported(line.name));
const copies = (deck: AnalyticsDeck, name: string) => deck.main.filter(line => line.name === name).reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
const range = (value: Range) => `${value.low}–${value.high}`;
const METRICS = [{ key: 'damage', label: 'Champion' }, { key: 'allies', label: 'Allies · total' }, { key: 'self', label: 'Self-inflicted' }, { key: 'recovery', label: 'Recovered' }] as const;

/** One shared scale, with text equivalents for every interval. */
function DamageInterval({ value, scale }: { value: Range; scale: number }) {
  const x = (n: number) => 6 + n / scale * 188;
  return <svg viewBox="0 0 200 18" className="mt-1 w-full" aria-hidden="true">
    <line x1="6" x2="194" y1="9" y2="9" className="stroke-ctp-surface1" />
    <line x1={x(value.low)} x2={x(value.high)} y1="9" y2="9" className="stroke-ctp-teal" strokeWidth="4" />
    <circle cx={x(value.median)} cy="9" r="4" className="fill-ctp-text" />
  </svg>;
}

export default function RaiDamageReport({ deck, cardsByName }: Props) {
  const report = useMemo(() => relevant(deck) ? computeRaiDamageReport(deck, cardsByName) : null, [deck, cardsByName]);
  if (!report) return null;
  const names = new Set(deck.main.filter(line => line.quantity > 0).map(line => line.name));
  const scenarios = report.status === 'ready' ? report.scenarios.filter(scenario => raiDamageScenarioRelevant(scenario.id, names)) : [];
  const scale = Math.max(1, ...scenarios.flatMap(scenario => scenario.points.flatMap(point => METRICS.map(metric => point[metric.key].high))));
  return <Panel data-component="RaiDamageReport">
    <h3 className="text-sm font-semibold">Paid spell damage</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Going first · middle 80% · before prevention</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai lineage'}</p> : <>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">{scenarios.map(scenario => <section key={scenario.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
          <h4 className="text-sm font-semibold">{scenario.label}</h4>
          <div className="mt-3 grid grid-cols-2 gap-4">{scenario.points.filter(point => point.turn === 3 || point.turn === 5).map(point => <div key={point.turn} className="min-w-0">
            <h5 className="text-xs font-semibold">By turn {point.turn}</h5>
            <dl className="mt-2 space-y-3">{METRICS.filter(metric => metric.key === 'damage' || scenario.points.some(p => p[metric.key].high > 0)).map(metric => <div key={metric.key}>
              <dt className="text-xs text-ctp-subtext1">{metric.label}</dt>
              <dd className="tabular-nums"><strong className="text-lg">{range(point[metric.key])}</strong><span className="block text-xs text-ctp-subtext1">{point[metric.key].median} median</span></dd>
              <DamageInterval value={point[metric.key]} scale={scale} />
            </div>)}</dl>
          </div>)}</div>
          <p className="mt-2 text-xs text-ctp-subtext1">0–{scale} damage</p>
        </section>)}</div>
        <AssociatedCards cardsByName={cardsByName} label="Paid damage cards" lines={deck.main.filter(line => supported(line.name))} />
      </div>
    </>}
  </Panel>;
}

export function RaiDamageComparison({ baseline, target, cardsByName, baselineLabel, targetLabel }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string;
}) {
  const report = useMemo(() => relevant(baseline) || relevant(target) ? compareRaiDamageReports(baseline, target, cardsByName) : null, [baseline, target, cardsByName]);
  if (!report) return null;
  const names = new Set([...baseline.main, ...target.main].filter(line => line.quantity > 0).map(line => line.name));
  return <section data-component="RaiDamageComparison" className="mt-4">
    <h4 className="font-semibold">Paid spell damage</h4>
    <p className="mt-1 break-words text-xs text-ctp-subtext1">{baselineLabel} → {targetLabel}</p>
    {report.status !== 'ready' ? <p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires both supported Rai lineages'}</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Going first · middle 80% · before prevention</p>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">{report.scenarios.filter(scenario => raiDamageScenarioRelevant(scenario.id, names)).map(scenario => <section key={scenario.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
          <h5 className="text-sm font-semibold">{scenario.label}</h5>
          <div className="mt-3 grid grid-cols-2 gap-4">{scenario.points.map(point => <div key={point.turn} className="min-w-0">
            <p className="text-xs font-semibold">By turn {point.turn}</p>
            <dl className="mt-2 space-y-3">{METRICS.filter(metric => metric.key === 'damage' || scenario.points.some(p => p.before[metric.key].high > 0 || p.after[metric.key].high > 0)).map(metric => {
              const delta = point.after[metric.key].median - point.before[metric.key].median;
              return <div key={metric.key}><dt className="text-xs text-ctp-subtext1">{metric.label}</dt>
                <dd className="text-sm font-semibold tabular-nums"><span className="inline-block">{range(point.before[metric.key])}</span> → <span className="inline-block">{range(point.after[metric.key])}</span></dd>
                <p className="text-xs text-ctp-subtext1">{delta > 0 ? '+' : ''}{delta} median</p>
              </div>;
            })}</dl>
          </div>)}</div>
        </section>)}</div>
        <AssociatedCards cardsByName={cardsByName} label="Compared paid damage cards" lines={RAI_DAMAGE_CARDS.map(name => ({ name, quantity: Math.max(copies(baseline, name), copies(target, name)), detail: `${copies(baseline, name)} → ${copies(target, name)}` }))} />
      </div>
    </>}
  </section>;
}
