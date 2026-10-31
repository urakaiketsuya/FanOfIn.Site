import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { BroadcastEventMap, BroadcastEventPairing, BroadcastTimelineMatch, Card } from '@gatcg/shared';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import TournamentMatch from './TournamentMatch';
import TournamentBracket from './TournamentBracket';
import { tournamentRoundLabel, tournamentWindow } from './tournamentLayout';

export default function EventTournament({ event, recaps, champions, params, update, matchingRecaps, search }: {
  event: BroadcastEventMap; recaps: BroadcastTimelineMatch[]; champions?: Card[]; params: URLSearchParams;
  update: (values: Record<string, string>) => void; matchingRecaps: Set<string>; search: string;
}) {
  const roundSelect = useRef<HTMLSelectElement>(null);
  const available = event.stages.filter(stage => stage.matches.length);
  const preferred = ((search.trim() || params.get('champion')) ? available.find(s => s.matches.some(m => (!!m.recapId && matchingRecaps.has(m.recapId)) || (!!search.trim() && m.players.some(p => p.name.toLowerCase().includes(search.trim().toLowerCase()))))) : undefined) ?? available.find(s => s.type === 'single-elimination') ?? available[0];
  const stage = available.find(s => String(s.id) === params.get('stage')) ?? preferred;
  if (!stage) return <p className="text-sm text-ctp-subtext1">Pairings unavailable. <Link to={`/events/${event.id}`} className="text-ctp-blue">Open event</Link></p>;
  const elimination = stage.type === 'single-elimination';
  const query = search.trim().toLowerCase();
  const isMatch = (m: BroadcastEventPairing) => (!!m.recapId && matchingRecaps.has(m.recapId)) || (!!query && m.players.some(p => p.name.toLowerCase().includes(query)));
  const filtering = !!query || !!params.get('champion');
  const found = stage.matches.filter(isMatch);
  const defaultRound = filtering && found.length ? found[0].round : elimination ? stage.rounds[Math.max(0, stage.rounds.length - 3)] : stage.rounds[0];
  const round = stage.rounds.find(r => String(r) === params.get('round')) ?? defaultRound;
  const roundIndex = stage.rounds.indexOf(round);
  const section = Math.max(0, Number(params.get('branch')) || 0);
  const window = tournamentWindow(stage, round, section);
  const highlight = new Set(found.map(m => m.id));
  const roundMatches = stage.matches.filter(m => m.round === round && (elimination || !filtering || isMatch(m)));
  const pageCount = Math.max(1, Math.ceil(roundMatches.length / 12));
  const page = Math.min(Math.max(0, Number(params.get('page')) || 0), pageCount - 1);
  const visible = roundMatches.slice(page * 12, (page + 1) * 12);
  const baseId = `event-${event.id}`;
  function changeRound(value: number) { update({ round: String(value), branch: '', page: '' }); }
  function card(match: BroadcastEventPairing, advance = false) {
    const next = stage.matches.find(m => m.id === match.next);
    return <TournamentMatch key={match.id} match={match} recap={recaps.find(m => m.id === match.recapId)} champions={champions} highlighted={filtering && highlight.has(match.id)}
      nextLabel={advance && next ? tournamentRoundLabel(stage, next.round) : undefined} onAdvance={next ? () => { changeRound(next.round); roundSelect.current?.focus(); } : undefined} />;
  }
  const roundControl = <div className="my-4 flex flex-wrap items-center gap-2">
    <Button disabled={roundIndex === 0} onClick={() => changeRound(stage.rounds[roundIndex - 1])} aria-label="Previous round">←</Button>
    <label className="min-w-0 flex-1 text-xs text-ctp-subtext1">Round<select ref={roundSelect} value={round} onChange={e => changeRound(Number(e.target.value))} className="block min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text">
      {stage.rounds.map(r => <option key={r} value={r}>{tournamentRoundLabel(stage, r)}</option>)}
    </select></label>
    <Button disabled={roundIndex === stage.rounds.length - 1} onClick={() => changeRound(stage.rounds[roundIndex + 1])} aria-label="Next round">→</Button>
    {elimination && window.roots.length > 1 && <label className="hidden text-xs text-ctp-subtext1 lg:block">Bracket section<select value={Math.min(section, window.roots.length - 1)} onChange={e => update({ branch: e.target.value })} className="block min-h-control max-w-64 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text">{window.roots.map((m, i) => <option key={m.id} value={i}>{m.players.map(p => p.name).join(' / ')}</option>)}</select></label>}
  </div>;
  return <section>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{event.name}</h2><p className="mt-1 text-sm text-ctp-subtext1">{new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} · {event.playerCount} players · {event.recapIds.length} recaps</p></div><Link to={`/events/${event.id}`} className="inline-flex min-h-control items-center text-sm text-ctp-blue">Event results →</Link></div>
    <Tabs baseId={baseId} label="Tournament stage" active={String(stage.id)} tabs={available.map(s => ({key: String(s.id), label: s.type === 'single-elimination' ? 'Top Cut' : s.type === 'swiss' ? 'Swiss' : s.type }))} onChange={value => update({ stage: value, round: '', branch: '', page: '' })} />
    {available.map(s => <TabPanel key={s.id} baseId={baseId} tab={String(s.id)} active={String(stage.id)}>
      {roundControl}
      <p className="mb-4 text-xs text-ctp-subtext1" aria-live="polite">Official results{filtering ? ` · ${found.length} matches across rounds` : ''}</p>
      {filtering && !found.length && <p className="mb-4 text-sm text-ctp-subtext1">No matching matches in this stage.</p>}
      {elimination && <TournamentBracket matches={window.matches}>
        {window.rounds.map(r => <div key={r} className="relative z-10 flex min-w-0 flex-col"><h3 className="mb-3 text-sm font-semibold text-ctp-subtext1">{tournamentRoundLabel(stage, r)}</h3><div className="flex flex-1 flex-col justify-around gap-6">{window.matches.filter(m => m.round === r).map(m => card(m))}</div></div>)}
      </TournamentBracket>}
      <div className={`grid gap-3 ${elimination ? 'lg:hidden' : 'md:grid-cols-2 xl:grid-cols-3'}`}>{visible.map(m => card(m, elimination))}</div>
      {pageCount > 1 && <div className={`mt-4 flex items-center gap-3 ${elimination ? 'lg:hidden' : ''}`}><Button disabled={page === 0} onClick={() => update({ page: String(page - 1) })}>Previous matches</Button><span className="text-sm">{page + 1} / {pageCount}</span><Button disabled={page + 1 === pageCount} onClick={() => update({ page: String(page + 1) })}>Next matches</Button></div>}
      {elimination && !!window.unlinked.length && <div className="mt-6 hidden lg:block"><h3 className="mb-3 text-sm font-semibold">Other recorded matches</h3><div className="grid gap-3 lg:grid-cols-3">{window.unlinked.map(m => card(m))}</div></div>}
      {elimination && stage.matches.some(m => m.bronze) && <div className="mt-6 hidden lg:block"><h3 className="mb-3 text-sm font-semibold">Bronze match</h3><div className="max-w-sm">{stage.matches.filter(m => m.bronze).map(m => card(m))}</div></div>}
    </TabPanel>)}
  </section>;
}
