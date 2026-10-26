import { useMemo } from 'react';
import { seasonFieldReport, type OmnidexEventSummary } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import { Bar, CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
export default function SeasonFieldReport({ events }: { events: OmnidexEventSummary[] }) {
  const reports = useMemo(() => seasonFieldReport(events), [events]);
  const names = useMemo(() => [...new Set(reports.flatMap(report => report.champions.map(c => c.name)))], [reports]);
  const cards = useChampionCardImages(names);
  return <section aria-label="Season field report" className="my-5 space-y-4">
    <h2 className="text-xl font-semibold">Which champions filled the field?</h2>
    {reports.length === 0 && <p className="text-sm text-ctp-subtext0">No completed individual events.</p>}
    {[...reports].sort((a,b) => b.months.reduce((s,m) => s+m.entrants,0) - a.months.reduce((s,m) => s+m.entrants,0)).map(report => <Panel key={report.format}>
      <h3 className="text-lg font-semibold capitalize">{report.format}</h3>
      <p className="text-xs text-ctp-subtext0">Worldwide · All tiers · Online + in person · Ranked + unranked</p>
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        {report.months.map(month => <div key={month.month}>
          <h4 className="font-medium">{monthLabel(month.month)}</h4>
          <p className="text-sm text-ctp-subtext1">{month.completeEvents}/{month.events} complete fields · {month.entrants.toLocaleString()} entries</p>
        </div>)}
      </div>
      {report.champions.length === 0 ? <p className="text-sm text-ctp-subtext0">Complete fields unavailable.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {report.champions.map(champion => <article key={champion.name} className="min-w-0 space-y-2">
          <CardIdentity name={champion.name} card={cards.get(champion.name)} />
          {report.months.map((month, i) => <div key={month.month}>
            <div className="flex justify-between gap-2 text-sm"><span className="text-ctp-subtext1">{monthLabel(month.month)}</span><strong className="tabular-nums">{champion.shares[i] === null ? 'Unavailable' : `${champion.shares[i]!.toFixed(1)}%`}</strong></div>
            {champion.shares[i] !== null && <Bar value={champion.shares[i]!} blue={i === 0 && report.months.length > 1} label={`${champion.name}, ${monthLabel(month.month)} field share`} />}
          </div>)}
        </article>)}
      </div>}
    </Panel>)}
  </section>;
}
