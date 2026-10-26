import { Link } from 'react-router-dom';
import { recordSize, type CompetitionPlayer } from '@gatcg/shared';
import { useCompetition } from './data';
import { MatchRecord } from './ReportValues';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
import { CardIdentity } from '../events/EventReportVisuals';
import { useChampionCardImages } from '../players/useChampionCardImages';
import { useCardsByNames } from '../events/useCardsByNames';
export default function PlayerCompetitionReport({ playerId }: { playerId: number }) {
  const { data, status } = useCompetition<CompetitionPlayer>('players');
  const player = data?.rows.find(p => p.playerId === playerId);
  const champions = useChampionCardImages(player?.formats.flatMap(f => [...f.builds.map(b => b.champion), ...f.opponents.map(o => o.name)]).filter((n): n is string => !!n) ?? []);
  const cards = useCardsByNames(player?.formats.flatMap(f => f.changes?.map(c => c.name) ?? []) ?? []);
  return <section aria-label="Recent player report" className="my-6 space-y-4"><h2 className="text-xl font-semibold">How has this player performed recently?</h2><PublishedSourceStatus label="Player reports" status={status} hasData={!!data} />{data && <p className="text-xs text-ctp-subtext1">{data.from} – {data.to} · Individual events · All tiers · Ranked + unranked</p>}{data && !player && <p>No recorded matches or lists in this period.</p>}
    {player?.formats.map(format => <Panel key={format.format} className="space-y-4"><h3 className="text-lg font-semibold capitalize">{format.format} · {format.events} events with recorded matches</h3><MatchRecord record={format.record} /><h4 className="font-semibold">Results by build</h4><div className="grid gap-4 sm:grid-cols-2">{format.builds.map((build, i) => <article key={i} className="min-w-0 space-y-2"><CardIdentity name={build.champion ?? 'Champion unavailable'} card={champions.get(build.champion ?? '')} />{build.href ? <Link className="flex min-h-control items-center text-sm text-ctp-blue" to={build.href}>{build.name}</Link> : <p>{build.name}</p>}<MatchRecord record={build.record} /></article>)}</div>
      <h4 className="font-semibold">Most faced champions</h4><p className="text-xs text-ctp-subtext1">{recordSize(format.record) - format.unidentifiedOpponents}/{recordSize(format.record)} matches identify the opponent’s champion</p><div className="grid gap-4 sm:grid-cols-2">{[...format.opponents].sort((a, b) => recordSize(b.record) - recordSize(a.record)).slice(0, 6).map(row => <article key={row.name} className="space-y-2"><CardIdentity name={row.name} card={champions.get(row.name)} /><MatchRecord record={row.record} /></article>)}</div>
      <h4 className="font-semibold">Latest two recorded lists</h4><div className="grid gap-3 sm:grid-cols-2">{format.evolution.map(e => <Link key={e.deckId} className="flex min-h-control flex-col justify-center rounded border border-ctp-surface1 p-3 text-sm text-ctp-blue focus-visible:outline-2" to={`/events/${e.eventId}?player=${playerId}`}>{e.date} · {e.champion ?? 'Unknown champion'}<span>{e.build}</span></Link>)}</div>
      {format.changes === null ? <p className="text-sm text-ctp-subtext1">Two usable lists unavailable.</p> : format.changes.length === 0 ? <p className="text-sm">Main + Material unchanged.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{format.changes.map(c => <article key={`${c.section}:${c.name}`}><CardIdentity name={c.name} card={cards.get(c.name)} /><p className="mt-2 text-sm capitalize">{c.section} · {c.before} → <strong>{c.after} copies</strong></p></article>)}</div>}
    </Panel>)}
  </section>;
}
