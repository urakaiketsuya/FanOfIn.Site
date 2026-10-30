import { Link } from 'react-router-dom';
import { recordPercent, recordSize, type CompetitionPlayer, type RecordCount } from '@gatcg/shared';
import { useCompetition } from './data';
import { percentage } from './format';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
import { Bar, CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';
import { useCardsByNames } from '../events/useCardsByNames';

function Result({ record }: { record: RecordCount }) {
  const value = recordPercent(record);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span><strong className="text-2xl tabular-nums">{percentage(value)}</strong><span className="ml-2 text-xs text-ctp-subtext1">wins</span></span>
      <span className="text-xs tabular-nums text-ctp-subtext1">{recordSize(record)} matches · {record.wins}W–{record.losses}L–{record.ties}T</span>
    </div>
    {value !== null && <Bar value={value} label="Match wins" />}
  </div>;
}

export default function PlayerCompetitionReport({ playerId }: { playerId: number }) {
  const { data, status } = useCompetition<CompetitionPlayer>('players');
  const player = data?.rows.find(p => p.playerId === playerId);
  const champions = useChampionCardImages(player?.formats.flatMap(f => [...f.builds.map(b => b.champion), ...f.opponents.map(o => o.name)]).filter((n): n is string => !!n) ?? []);
  const cards = useCardsByNames(player?.formats.flatMap(f => f.changes?.map(c => c.name) ?? []) ?? []);
  return <section aria-label="Recent player report" className="my-6 space-y-5">
    <div><h2 className="text-xl font-semibold">Recent results</h2>{data && <p className="mt-1 text-xs text-ctp-subtext1">{data.from} – {data.to} · Individual events · All tiers · Ranked + unranked</p>}</div>
    <PublishedSourceStatus label="Player reports" status={status} hasData={!!data} />
    {data && (!player || player.formats.length === 0) && <Panel><p className="text-sm text-ctp-subtext1">No recorded matches or decks in this period.</p></Panel>}
    {player?.formats.map(format => <Panel key={format.format} className="space-y-6">
      <div className="space-y-3"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold capitalize">{format.format}</h3><span className="text-sm text-ctp-subtext1">{format.events} events</span></div><Result record={format.record} /></div>
      <div><h4 className="mb-3 font-semibold">Played builds</h4><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{format.builds.map((build, i) => <article key={`${build.name}:${i}`} className="min-w-0 space-y-3 rounded-xl bg-ctp-base/60 p-3"><CardIdentity name={build.champion ?? 'Champion unavailable'} card={champions.get(build.champion ?? '')} />{build.href ? <Link className="flex min-h-control items-center break-words text-sm font-medium text-ctp-blue focus-visible:outline-2" to={build.href}>{build.name}</Link> : <p className="text-sm">{build.name}</p>}<Result record={build.record} /></article>)}</div>{format.builds.length === 0 && <p className="text-sm text-ctp-subtext1">No identified builds.</p>}</div>
      <div><div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold">Against champions</h4><span className="text-xs text-ctp-subtext1">{recordSize(format.record) - format.unidentifiedOpponents}/{recordSize(format.record)} opponents identified</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...format.opponents].sort((a, b) => recordSize(b.record) - recordSize(a.record)).slice(0, 6).map(row => <article key={row.name} className="min-w-0 space-y-3"><CardIdentity name={row.name} card={champions.get(row.name)} /><Result record={row.record} /></article>)}</div>{format.opponents.length === 0 && <p className="text-sm text-ctp-subtext1">No identified opponent champions.</p>}</div>
      <div><h4 className="mb-3 font-semibold">Latest decks</h4><div className="grid gap-3 sm:grid-cols-2">{format.evolution.map(e => <Link key={e.deckId} className="flex min-h-control flex-col justify-center rounded-lg border border-ctp-surface1 p-3 text-sm text-ctp-blue focus-visible:outline-2" to={`/events/${e.eventId}?player=${playerId}`}><span className="text-xs text-ctp-subtext1">{e.date}</span><span className="mt-1 break-words font-medium">{e.champion ?? 'Unknown champion'} · {e.build}</span></Link>)}</div>{format.evolution.length === 0 && <p className="text-sm text-ctp-subtext1">No public decks.</p>}</div>
      {format.changes !== null && <div><h4 className="mb-3 font-semibold">Latest deck changes</h4>{format.changes.length === 0 ? <p className="text-sm text-ctp-subtext1">Main + Material unchanged</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{format.changes.map(c => <article key={`${c.section}:${c.name}`}><CardIdentity name={c.name} card={cards.get(c.name)} /><p className="mt-2 text-sm capitalize text-ctp-subtext1">{c.section} · {c.before} → <strong className="text-ctp-text">{c.after} copies</strong></p></article>)}</div>}</div>}
    </Panel>)}
  </section>;
}
