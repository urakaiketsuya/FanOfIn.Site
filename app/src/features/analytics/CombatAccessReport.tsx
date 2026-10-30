import { useMemo } from 'react';
import { CONDITIONAL_COMBAT_RESULTS, computeCombatAccessForecast, REPORT_DRAW_CHECKPOINTS, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

export default function CombatAccessReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const points = useMemo(() => REPORT_DRAW_CHECKPOINTS.map(seen => computeCombatAccessForecast(deck.main, deck.material, cardsByName, seen)), [deck.main, deck.material, cardsByName]);
  const allies = new Set([...deck.main, ...deck.material].filter(line => cardsByName.get(line.name)?.types.includes('ALLY')).map(line => line.name));
  const boosts = new Set(points.flatMap(point => point.sources.filter(source => source.addedPower > 0).map(source => source.name)));
  const lines = [...deck.main, ...deck.material].filter(line => allies.has(line.name) || boosts.has(line.name));
  const unmodeled = [...new Set(points.flatMap(point => point.unmodeled))];
  const conditional = [...deck.main, ...deck.material].filter(line => line.quantity > 0 && cardsByName.has(line.name) && CONDITIONAL_COMBAT_RESULTS[line.name]);
  const remaining = unmodeled.filter(name => !conditional.some(line => line.name === name));
  const different = points.some(point => point.printedPower !== point.boostedPower);
  const scale = Math.max(1, ...points.flatMap(point => [point.printedRange.high, point.boostedRange.high]));
  const models = different ? ['printedRange', 'boostedRange'] as const : ['printedRange'] as const;
  return <Panel data-component="CombatAccessReport">
    <h3 className="font-semibold">Ally attack potential</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Sampled draws · before costs and resolution</p>
    {points.some(point => point.unavailable) ? <p role="status" className="mt-3 text-sm text-ctp-yellow">Card data incomplete · attack report unavailable.</p> : !allies.size ? <p className="mt-3 text-sm">No attacking allies found.</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Median · middle 80% of draws</p>
      <div className="my-4 grid gap-4 xl:grid-cols-2">{models.map(model => <section key={model} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <div className="xl:min-h-14"><h4 className="text-sm font-semibold">{model === 'printedRange' ? 'Printed ally power' : 'With supported boosts'}</h4>
        {model === 'boostedRange' && <p className="mt-1 text-xs text-ctp-subtext1">One attack · listed champion reached · sources resolved</p>}</div>
        <div className="mt-4 space-y-4">{points.map(point => {
          const range = point[model];
          return <div key={point.seen}>
            <p className="flex flex-wrap justify-between gap-2 text-sm"><span>{point.seen} cards seen</span><span><strong>{range.median} power</strong><span className="text-xs text-ctp-subtext1"> · {range.low}–{range.high}</span></span></p>
            <svg viewBox="0 0 300 22" className="w-full" aria-hidden="true">
              <line x1="8" x2="292" y1="11" y2="11" className="stroke-ctp-surface1" strokeWidth="4" />
              <line x1={8 + range.low / scale * 284} x2={8 + range.high / scale * 284} y1="11" y2="11" className={model === 'printedRange' ? 'stroke-ctp-blue' : 'stroke-ctp-teal'} strokeWidth="5" />
              <circle cx={8 + range.median / scale * 284} cy="11" r="5" className="fill-ctp-text" />
            </svg>
          </div>;
        })}</div>
      </section>)}</div>
      <AssociatedCards lines={lines} cardsByName={cardsByName} />
      {conditional.length > 0 && <section className="mt-5" data-component="ConditionalCombatResults">
        <h4 className="font-semibold">Conditional outcomes</h4>
        <p className="mt-1 text-xs text-ctp-subtext1">Per copy · separate from draw ranges</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{conditional.map(line => {
          const result = CONDITIONAL_COMBAT_RESULTS[line.name];
          return <article key={line.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
            <AssociatedCards lines={[line]} cardsByName={cardsByName} />
            <p className="my-3 text-xs text-ctp-subtext1">{result.condition}</p>
            <dl className="flex flex-wrap gap-4">{result.outcomes.map(outcome => <div key={outcome.label}><dt className="text-xs text-ctp-subtext1">{outcome.label}</dt><dd className="text-sm font-semibold">{outcome.value}</dd></div>)}</dl>
            {line.name === 'Lustrous Slime' && <p className="mt-2 text-xs text-ctp-subtext1">Power on entry · recovery on death</p>}
          </article>;
        })}</div>
      </section>}
      {remaining.length > 0 && <p role="status" className="mt-3 text-xs text-ctp-yellow">Other conditional effects not counted: {remaining.join(' · ')}</p>}
    </>}
  </Panel>;
}
