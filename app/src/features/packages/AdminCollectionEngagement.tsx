import type { CollectionEngagement } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';

const weekLabel = (start: string) => new Date(start + 'T00:00:00Z').toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', timeZone: 'UTC',
});

export default function AdminCollectionEngagement({ metrics }: { metrics?: CollectionEngagement }) {
  const max = Math.max(1, ...metrics?.weeks.map(week => week.firstCollectors) ?? []);
  return <section className="mb-6 space-y-3" aria-labelledby="collection-engagement-title">
    <h2 id="collection-engagement-title" className="text-lg font-semibold">Collection activity & adoption</h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {([
        ['Active collectors · 7 days', metrics?.active7Days?.toLocaleString()],
        ['Active collectors · 30 days', metrics?.active30Days?.toLocaleString()],
        ['Collection adoption', metrics ? metrics.adoptionPercent === null ? 'No accounts yet' : `${metrics.adoptionPercent.toFixed(1)}%` : undefined],
      ] as const).map(([label, value]) => <Panel key={label}>
        <h3 className="text-sm">{label}</h3><p className="break-words text-3xl font-semibold">{value ?? 'Unavailable'}</p>
      </Panel>)}
    </div>
    <p className="text-sm text-ctp-subtext1">Active: changed or undid card inventory. Adoption: accounts with cards tracked.</p>
    <Panel>
      <h3 className="font-semibold">New collectors by week</h3>
      <p className="mb-4 text-sm text-ctp-subtext1">First collection save · UTC weeks · current week in progress</p>
      {!metrics ? <p>Trend unavailable</p> : <>
        {!metrics.weeks.some(week => week.firstCollectors > 0) && <p className="mb-3 text-sm">No first collection saves in these weeks.</p>}
        <ol className="space-y-3">
          {metrics.weeks.map(week => <li key={week.start}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span>Week of {weekLabel(week.start)}</span>
              <span className="font-semibold tabular-nums">{week.firstCollectors.toLocaleString()}</span>
            </div>
            <div aria-hidden="true" className="h-2 rounded-full bg-ctp-surface0">
              <div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${week.firstCollectors / max * 100}%` }} />
            </div>
          </li>)}
        </ol>
      </>}
    </Panel>
  </section>;
}
