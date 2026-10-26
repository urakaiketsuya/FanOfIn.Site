import { recordPercent, recordSize, type CompetitionBattle } from '@gatcg/shared';
import { useCompetition } from './data';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
import { Bar, CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';
function FormatReport({ report }: { report: CompetitionBattle }) {
  const rows = report.rows.filter(r => r.a !== r.b).sort((a, b) => b.records.reduce((s, r) => s + recordSize(r), 0) - a.records.reduce((s, r) => s + recordSize(r), 0)).slice(0, 12);
  const cards = useChampionCardImages([...new Set(rows.flatMap(r => [r.a, r.b]))]);
  return <Panel className="space-y-4"><h3 className="text-lg font-semibold capitalize">{report.format} · Most recorded matchups</h3><p className="text-xs text-ctp-subtext1">Worldwide · All tiers · Individual events · Ranked + unranked</p><div className="grid gap-3 sm:grid-cols-2">{report.periods.map(p => <div key={p.from}><strong>{p.from} – {p.to}</strong><p className="text-xs text-ctp-subtext1">{p.identified}/{p.matches} recorded matches identify both champions · {p.pairingEvents}/{p.events} events have all fetched pairing rounds</p></div>)}</div>
    {!rows.length && <p>Champion matchups unavailable.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{rows.map(row => <article key={JSON.stringify([row.a, row.b])} className="min-w-0 space-y-3 rounded-lg border border-ctp-surface1 p-3"><CardIdentity name={row.a} card={cards.get(row.a)} /><p className="text-xs text-ctp-subtext1">Win rate against</p><CardIdentity name={row.b} card={cards.get(row.b)} /><div className="space-y-2">{row.records.map((r, i) => <div key={i}><p className="text-sm">{i === 0 ? 'Previous 90 days' : 'Latest 90 days'} · <strong>{recordPercent(r)?.toFixed(1) ?? 'Unavailable'}{recordPercent(r) !== null && '%'}</strong></p><div className="my-1">{recordPercent(r) !== null && <Bar value={recordPercent(r)!} blue={i === 0} label={`${row.a} vs ${row.b}, ${i === 0 ? "previous" : "latest"} win rate`} />}</div><p className="text-xs text-ctp-subtext1">{r.wins}W · {r.losses}L · {r.ties}T · {recordSize(r)} matches</p></div>)}</div>{row.records.every(r => recordSize(r)) && <p className="font-semibold">{(recordPercent(row.records[1])! - recordPercent(row.records[0])!).toFixed(1)} pp</p>}</article>)}</div>
  </Panel>;
}
export default function BattlePeriodReport() {
  const { data, status } = useCompetition<CompetitionBattle>('battle');
  return <section className="my-6 space-y-4" aria-label="Recent matchup report"><h2 className="text-xl font-semibold">How did matchups change?</h2><PublishedSourceStatus label="Matchup reports" status={status} hasData={!!data} />{data && !data.rows.length && <p>No recorded matchups.</p>}{data?.rows.map(report => <FormatReport key={report.format} report={report} />)}</section>;
}
