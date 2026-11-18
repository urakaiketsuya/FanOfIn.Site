import { useCallback, useEffect, useState } from 'react';
import type { AdminSiteHealth as SiteHealth } from '@gatcg/shared';
import { accountApi } from '../../lib/accountApi';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const operationLabels: Record<string, string> = {
  'deck-save': 'Deck changes', 'deck-import': 'Deck imports', collection: 'Collection changes',
  combo: 'Combos', 'match-log': 'Match logs', analysis: 'Saved analysis', trade: 'Trading',
};
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function AdminSiteHealth({ refreshKey }: { refreshKey?: string }) {
  const [health, setHealth] = useState<SiteHealth>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setHealth(await accountApi.adminSiteHealth()); }
    catch { setError('Site health could not load.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);
  const max = Math.max(1, ...(health?.features.map(feature => feature.users) ?? []));
  return <section className="mb-8 space-y-4" aria-labelledby="site-health-title">
    <h2 id="site-health-title" className="text-xl font-semibold">Site health</h2>
    {loading && <p role="status">Loading site health…</p>}
    {error && <div><p role="alert">{error}</p><Button onClick={() => void load()}>Retry site health</Button></div>}
    {health && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          ['Active accounts · 7 days', health.active7Days],
          ['Active accounts · 30 days', health.active30Days],
          ['Deck creators · 30 days', health.deckCreators30Days],
          ['New accounts · 7 days', health.newUsers7Days],
          ['New accounts · 30 days', health.newUsers30Days],
        ] as const).map(([label, total]) => <Panel key={label}><h3 className="text-sm">{label}</h3><p className="break-words text-3xl font-semibold">{total.toLocaleString()}</p></Panel>)}
      </div>
      <p className="text-sm text-ctp-subtext1">Active accounts saved or changed content in the features below.</p>
      <Panel>
        <h3 className="font-semibold">Saved feature usage · 30 days</h3>
        <p className="mb-3 text-sm text-ctp-subtext1">Unique accounts per feature</p>
        {!health.features.some(feature => feature.users) && <p className="mb-3 text-sm">No saved activity in this period.</p>}
        <ul className="space-y-3">{health.features.map(feature => <li key={feature.key}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span>{feature.label}</span><span className="tabular-nums">{feature.users.toLocaleString()}</span></div>
          <div aria-hidden="true" className="h-2 rounded-full bg-ctp-surface0"><div className="h-2 rounded-full bg-ctp-blue" style={{ width: `${feature.users / max * 100}%` }} /></div>
        </li>)}</ul>
      </Panel>
      <Panel>
        <h3 className="font-semibold">Account operations · 30 UTC days</h3>
        {!health.operations ? <p className="mt-2">Operation tracking unavailable</p> : <>
          <p className="mt-1 text-sm text-ctp-subtext1">Tracking since {dateLabel(health.operations.coverageStartedAt)}</p>
          {!health.operations.rows.length ? <p className="mt-3">No recorded operations in this period.</p> : <ul className="mt-3 space-y-3">
            {health.operations.rows.map(row => <li key={row.operation} className="border-t border-ctp-surface1 pt-3">
              <h4 className="font-medium">{operationLabels[row.operation] ?? row.operation}</h4>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {([['Attempts', row.requests], ['Rejected · 4xx', row.rejected], ['Errors · 5xx', row.errors]] as const).map(([label, value]) =>
                  <div key={label}><dt className="text-ctp-subtext1">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</dd></div>)}
              </dl>
            </li>)}
          </ul>}
        </>}
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">Published data freshness</h3>
        <dl className="space-y-3">{health.freshness.map(source => <div key={source.key} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <dt>{source.label}</dt><dd className="text-ctp-subtext1">{source.updatedAt ? dateLabel(source.updatedAt) + ' UTC' : 'Unavailable'}</dd>
        </div>)}</dl>
      </Panel>
    </>}
  </section>;
}
