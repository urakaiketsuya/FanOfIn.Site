import type { Card } from '@gatcg/shared';
import type { AggressionForecast } from '../../lib/aggressionForecast';
import AssociatedCards from '../../components/AssociatedCards';

/** Each interval comes from one distribution. Never join endpoints from different models. */
export default function DamageStatisticalReport({ forecast, cardsByName }: { forecast: AggressionForecast; cardsByName: Map<string, Card> }) {
  const sources = forecast.audit.filter(row => row.status === 'modeled' || row.status === 'partial');
  const missing = forecast.audit.filter(row => row.status === 'review' || row.status === 'partial');
  const different = forecast.points.some(p => p.medianMin !== p.medianMax || p.low !== p.optimisticLow || p.conservativeHigh !== p.high || p.expectedMin !== p.expectedMax);
  const scale = Math.max(1, ...forecast.points.map(p => p.high), ...forecast.points.map(p => p.conservativeHigh));
  const models = different ? ['conservative', 'conditional'] as const : ['conservative'] as const;
  return <section data-component="DamageStatisticalReport" className="mt-4 space-y-4">
    <div><h3 className="font-semibold">How much printed damage do your draws contain?</h3>
      <p className="mt-1 text-xs text-ctp-subtext1">Potential output · affordability and resolution excluded</p>
      <p className="mt-1 text-xs text-ctp-subtext1">First-player progression assumption · {forecast.deckSize}-card library</p></div>
    {!sources.length && <p role="status" className="text-sm">No modeled direct-damage sources.</p>}
    {sources.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{models.map(model => <section key={model} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
      <h4 className="text-sm font-semibold">{different ? model === 'conservative' ? 'Conservative model' : 'Conditional ceiling model' : 'Modeled printed damage'}</h4>
      <p className="mt-1 text-xs text-ctp-subtext1">Dot: median · line: 10th–90th percentiles</p>
      <div className="mt-3 space-y-4">{forecast.points.map(point => {
        const conditional = model === 'conditional';
        const low = conditional ? point.optimisticLow : point.low;
        const high = conditional ? point.high : point.conservativeHigh;
        const median = conditional ? point.medianMax : point.medianMin;
        const chance = conditional ? point.chanceAtLeastTenMax : point.chanceAtLeastTenMin;
        return <div key={point.seen}>
          <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{point.seen} cards seen</span><span><strong>{median}</strong> median · {low}–{high} range</span></div>
          <svg viewBox="0 0 300 26" className="w-full" aria-hidden="true">
            <line x1="8" x2="292" y1="13" y2="13" className="stroke-ctp-surface1" />
            <line x1={8 + low / scale * 284} x2={8 + high / scale * 284} y1="13" y2="13" className="stroke-ctp-blue" strokeWidth="4" />
            {[low, high].map((value, i) => <line key={i} x1={8 + value / scale * 284} x2={8 + value / scale * 284} y1="8" y2="18" className="stroke-ctp-blue" strokeWidth="2" />)}
            <circle cx={8 + median / scale * 284} cy="13" r="5" className="fill-ctp-text" />
          </svg>
          <p className="text-xs text-ctp-subtext1">{(chance * 100).toFixed(1)}% contain 10+ damage{point.sampleSize ? ' · sampled' : ''}</p>
        </div>;
      })}</div>
      <div className="mt-2 flex justify-between text-xs text-ctp-subtext1"><span>0</span><span>{scale} damage</span></div>
    </section>)}</div>}
    <AssociatedCards lines={sources.map(row => ({ name: row.name, quantity: row.quantity, detail: row.section }))} cardsByName={cardsByName} label="Modeled damage sources" />
    {forecast.recurringDamagePerTurn > 0 && <p className="text-xs">Separate recurring output: {forecast.recurringDamagePerTurn} damage per turn once enabled</p>}
    {missing.length > 0 && <div role="status" className="text-xs text-ctp-yellow"><p>Damage coverage incomplete</p>{missing.map(row => <p key={`${row.section}:${row.name}`}>{row.name} · {row.status === 'partial' ? 'partly modeled' : 'not modeled'}</p>)}</div>}
  </section>;
}
