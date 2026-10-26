import { Link } from 'react-router-dom';
import { recordPercent, recordSize, type RecordCount, type ReportValue } from '@gatcg/shared';
import { Bar, CardIdentity } from '../events/EventReportVisuals';
import { useCardsByNames } from '../events/useCardsByNames';
import { useChampionCardImages } from '../players/useChampionCardImages';
import { percentage } from "./format";
export function MatchRecord({ record }: { record: RecordCount }) {
  return <div><strong className="text-xl tabular-nums">{percentage(recordPercent(record))}</strong><span className="ml-2 text-xs text-ctp-subtext1">wins · {recordSize(record)} matches</span><p className="text-xs text-ctp-subtext1">{record.wins}W · {record.losses}L · {record.ties}T</p></div>;
}
/** Exact values and counts remain visible without hover. Artwork identifies, never encodes magnitude. */
export default function ReportValues({ rows, labels, champions = false, countLabel = 'lists' }: { rows: ReportValue[]; labels: string[]; champions?: boolean; countLabel?: string }) {
  const names = rows.map(row => row.champion ?? row.name);
  const cards = useCardsByNames(champions ? [] : names);
  const championCards = useChampionCardImages(champions ? names : []);
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(row => <article key={row.href ?? row.name} className="min-w-0 space-y-2">
    <CardIdentity name={row.champion ?? row.name} card={(champions ? championCards : cards).get(row.champion ?? row.name)} />
    {row.href && <Link className="flex min-h-control items-center break-words rounded text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" to={row.href}>{row.name}</Link>}
    {labels.map((label, i) => <div key={label}><div className="flex flex-wrap justify-between gap-x-2 text-sm"><span className="text-ctp-subtext1">{label}</span><strong className="tabular-nums">{percentage(row.values[i])}</strong></div>{row.values[i] !== null && <Bar value={row.values[i]} label={`${row.name}, ${label}`} blue={i === 0 && labels.length > 1} />}<p className="text-xs text-ctp-subtext0">{row.counts[i]} {countLabel}</p></div>)}
    {row.values.length === 2 && row.values.every(v => v !== null) && <p className="text-sm font-semibold tabular-nums">{row.values[1]! - row.values[0]! > 0 ? '+' : ''}{(row.values[1]! - row.values[0]!).toFixed(1)} pp</p>}
  </article>)}</div>;
}
