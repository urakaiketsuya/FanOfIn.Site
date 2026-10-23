import { useMemo, useState } from 'react';
import { computeCombatAccessForecast, REPORT_DRAW_CHECKPOINTS, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';

export default function CombatAccessReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const points = useMemo(() => REPORT_DRAW_CHECKPOINTS.map(seen => computeCombatAccessForecast(deck.main, deck.material, cardsByName, seen)), [deck.main, deck.material, cardsByName]);
  const [metric, setMetric] = useState<'printedPower' | 'boostedPower'>('printedPower');
  const allies = new Set([...deck.main, ...deck.material].filter(line => cardsByName.get(line.name)?.types.includes('ALLY')).map(line => line.name));
  const boosts = new Set(points.flatMap(point => point.sources.filter(source => source.addedPower > 0).map(source => source.name)));
  const lines = [...deck.main, ...deck.material].filter(line => allies.has(line.name) || boosts.has(line.name));
  const unmodeled = [...new Set(points.flatMap(point => point.unmodeled))];
  const scale = Math.max(1, ...points.flatMap(point => [point.printedPower, point.boostedPower]));
  return <Panel data-component="CombatAccessReport">
    <h3 className="font-semibold">How much ally power do your draws contain?</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Sampled mean potential · before costs, Intercept and resolution · {Math.max(60, deck.main.reduce((sum, line) => sum + line.quantity, 0))}-card library</p>
    {points.some(point => point.unavailable) ? <p role="status" className="mt-3 text-sm text-ctp-yellow">Card data incomplete · attack report unavailable.</p> : <>
      <div className="my-3 flex flex-wrap gap-2">{(['printedPower', 'boostedPower'] as const).map(key => <Button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{key === 'printedPower' ? 'Printed ally power' : 'With boosts & deployment'}</Button>)}</div>
      <div className="space-y-3">{points.map(point => <div key={point.seen}><p className="flex justify-between gap-2 text-sm"><span>{point.seen} cards seen</span><strong>{point[metric].toFixed(1)} power</strong></p><div aria-hidden="true" className="mt-1 h-2 rounded bg-ctp-surface1"><div className="h-full rounded bg-ctp-blue" style={{ width: `${point[metric] / scale * 100}%` }} /></div></div>)}</div>
      <p className="my-3 text-xs text-ctp-subtext1">{metric === 'printedPower' ? 'Ally pool' : 'Supported boost sources'} · Musicbox replay excluded</p>
      <AssociatedCards lines={lines} cardsByName={cardsByName} highlighted={metric === 'printedPower' ? allies : boosts} />
      {!lines.length && <p className="text-sm">No attacking allies or supported boosts found.</p>}
      {unmodeled.length > 0 && <p role="status" className="mt-3 text-xs text-ctp-yellow">Power effects not counted: {unmodeled.join(' · ')}</p>}
    </>}
  </Panel>;
}
