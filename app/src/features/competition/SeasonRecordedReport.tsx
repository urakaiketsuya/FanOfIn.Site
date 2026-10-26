import type { SeasonRecordedReport as Report } from '@gatcg/shared';
import { useCompetition } from './data';
import ReportValues from './ReportValues';
import { monthLabel } from './format';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
export default function SeasonRecordedReport({ seasonId }: { seasonId: number }) {
  const { data, status } = useCompetition<Report>('seasons');
  const reports = data?.rows.filter(r => r.seasonId === seasonId).sort((a,b) => b.months.reduce((s,m) => s+m.decks,0) - a.months.reduce((s,m) => s+m.decks,0)) ?? [];
  return <section aria-label="Season recorded decks" className="my-6 space-y-4"><h2 className="text-xl font-semibold">Which builds and cards changed?</h2>
    <PublishedSourceStatus label="Season reports" status={status} hasData={!!data} />
    {data && !reports.length && <p>No recorded deck periods.</p>}
    {reports.map(report => {
      const gains = report.builds.filter(b => b.href && b.values.length === 2 && b.values.every(v => v !== null) && b.values[1]! > b.values[0]!).sort((a, b) => (b.values[1]! - b.values[0]!) - (a.values[1]! - a.values[0]!)).slice(0, 3);
      const rows = [...new Set([...report.builds.slice(0, 6), ...gains, ...report.builds.filter(b => !b.href)])];
      return <Panel key={report.format} className="space-y-5"><h3 className="text-lg font-semibold capitalize">{report.format} · Recorded decks</h3><p className="text-xs text-ctp-subtext1">Worldwide · All tiers · Online + in person · Ranked + unranked</p>
        <div className="grid gap-2 sm:grid-cols-2">{report.months.map(m => <div key={m.month}><strong>{monthLabel(m.month)}{data?.to.startsWith(m.month) ? ' · through ' + data.to : ''}</strong><p className="text-sm text-ctp-subtext1">{m.decks} recorded decks · {m.lists} usable lists · {m.observedEvents}/{m.events} events sampled</p></div>)}</div>
        <h4 className="font-semibold">Most recorded builds and largest gains</h4>
        {rows.length ? <ReportValues rows={rows} labels={report.months.map(m => monthLabel(m.month))} champions countLabel="decks" /> : <p>Build shares unavailable.</p>}
        <h4 className="font-semibold">Card changes · Four most recorded champions</h4>
        {[...report.cards].sort((a, b) => b.lists.reduce((s,n) => s+n,0) - a.lists.reduce((s,n) => s+n,0)).slice(0, 4).map(group => <div key={group.champion} className="space-y-3 border-t border-ctp-surface1 pt-4"><h4 className="font-semibold">{group.champion} · Largest card adoption changes</h4><p className="text-xs text-ctp-subtext1">{group.lists.map((n, i) => `${monthLabel(report.months[i].month)}: ${n} lists`).join(' · ')} · Main + Material</p>{group.rows.length ? <ReportValues rows={group.rows} labels={report.months.map(m => monthLabel(m.month))} /> : <p className="text-sm text-ctp-subtext1">{group.lists.length < 2 || group.lists.some(n => !n) ? 'Comparison unavailable.' : 'No adoption changes.'}</p>}</div>)}
      </Panel>;
    })}
  </section>;
}
