import { fixtureAccess, type Card } from '@gatcg/shared';
import type { AggressionForecast } from '../../lib/aggressionForecast';
import AssociatedCards from '../../components/AssociatedCards';

/** Each interval comes from one distribution. Never join endpoints from different models. */
export default function DamageStatisticalReport({ forecast, cardsByName }: { forecast: AggressionForecast; cardsByName: Map<string, Card> }) {
  const sources = forecast.audit.filter(row => row.status === 'modeled' || row.status === 'partial');
  const missing = forecast.audit.filter(row => row.status === 'review' || row.status === 'partial');
  const quantified = forecast.points.some(point => point.expectedMax > 0 || point.expectedMin > 0);
  const accessSources = forecast.audit.filter(row => row.section === 'Main' && row.status !== 'excluded');
  const different = forecast.points.some(p => p.medianMin !== p.medianMax || p.low !== p.optimisticLow || p.conservativeHigh !== p.high || p.expectedMin !== p.expectedMax);
  const scale = Math.max(1, ...forecast.points.map(p => p.high), ...forecast.points.map(p => p.conservativeHigh));
  const models = different ? ['conservative', 'conditional'] as const : ['conservative'] as const;
  return <section data-component="DamageStatisticalReport" className="@container mt-4 space-y-4">
    <div><h3 className="font-semibold">Damage sources</h3>
      <p className="mt-1 text-xs text-ctp-subtext1">Direct damage · before costs/resolution</p>
      <p className="mt-1 text-xs text-ctp-subtext1">First-player progression · {forecast.deckSize}-card library</p></div>
    {!quantified && <p role="status" className="text-sm">{missing.length ? 'Damage depends on the board or game state.' : 'No direct damage in this model.'}</p>}
    {quantified && <div className="grid gap-4 @lg:grid-cols-2">{models.map(model => <section key={model} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
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
    {quantified && <AssociatedCards lines={sources.map(row => ({ name: row.name, quantity: row.quantity, detail: row.section }))} cardsByName={cardsByName} label="Modeled damage sources" />}
    {forecast.recurringDamagePerTurn > 0 && <p className="text-xs">Separate recurring output: {forecast.recurringDamagePerTurn} damage per turn once enabled</p>}
    {accessSources.length > 0 && <div className="space-y-4">{accessSources.filter(row => !quantified || row.status === 'partial' || row.status === 'review').map(row => <article key={row.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
      <h4 className="text-sm font-semibold">{row.name}</h4>
      <p className="mt-1 text-xs text-ctp-subtext1">Chance to draw 1+</p>
      <dl className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{forecast.points.map(point => <div key={point.seen}><dt className="text-xs text-ctp-subtext1">{point.seen} cards seen</dt><dd className="text-lg font-semibold tabular-nums">{(fixtureAccess(forecast.deckSize, row.quantity, point.seen) * 100).toFixed(1)}%</dd></div>)}</dl>
      {row.name === 'Storm Slime' ? <><p className="mb-3 text-sm font-semibold">1 damage per banished Slime · on entry</p><dl className="mb-3 grid grid-cols-3 gap-2">{[2, 4, 6].map(count => <div key={count}><dt className="text-xs text-ctp-subtext1">{count} banished</dt><dd className="font-semibold">{count} damage</dd></div>)}</dl></> : <p className="mb-3 text-xs text-ctp-subtext1">{row.status === 'review' ? 'Damage amount not modeled' : 'Conditional damage · not a resolved total'}</p>}
      <AssociatedCards lines={[{ name: row.name, quantity: row.quantity }]} cardsByName={cardsByName} label={`${row.name} damage source`} />
    </article>)}</div>}
    {missing.filter(row => row.section === 'Material').length > 0 && <div className="text-xs text-ctp-subtext1"><p className="mb-2">Material effects · separate from draws</p><AssociatedCards lines={missing.filter(row => row.section === 'Material').map(row => ({ name: row.name, quantity: row.quantity, detail: row.classification }))} cardsByName={cardsByName} /></div>}
  </section>;
}
