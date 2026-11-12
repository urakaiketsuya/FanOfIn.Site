import PlayerSearchResult from '../players/PlayerSearchResult';
import { usePlayerDecksData } from '../players/data';
import { useChampionCardImages, useNamelessChampionCard } from '../players/useChampionCardImages';
import { useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import type { BestPlayersData } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import CardArtTile from '../../components/CardArtTile';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import { useCardsByNames } from '../events/useCardsByNames';
import { usePlayerNameById } from '../tournaments/data';

export default function BestPlayers({ cardName, playerId }: { cardName?: string; playerId?: number }) {
  const data = usePublishedData<BestPlayersData>('analysis-best-players', '/data/analysis/best-players.json');
  const status = usePublishedDataStatus('analysis-best-players', '/data/analysis/best-players.json');
  const playerName = usePlayerNameById();
  const [format, setFormat] = useState('standard');
  const [season, setSeason] = useState('all');
  const [limit, setLimit] = useState(12);
  const [pending, startTransition] = useTransition();
  const relevant = useMemo(() => data?.rankings.filter(g => cardName ? g.card === cardName : g.players.some(p => p.playerId === playerId)) ?? [], [data, cardName, playerId]);
  const formats = [...new Set(relevant.map(g => g.format))].sort();
  const selectedFormat = formats.includes(format) ? format : formats[0] ?? format;
  const seasons = [...new Map(relevant.filter(g => g.format === selectedFormat && g.seasonId !== null).map(g => [String(g.seasonId), g.seasonName])).entries()];
  const selectedSeason = season === 'all' || seasons.some(([id]) => id === season) ? season : 'all';
  const rows = relevant.filter(g => g.format === selectedFormat && (selectedSeason === 'all' ? g.seasonId === null : String(g.seasonId) === selectedSeason));
  const cards = useCardsByNames(playerId === undefined ? [] : rows.slice(0, limit).map(g => g.card));
  const playerDecks = usePlayerDecksData();
  const champions = useMemo(() => new Map(playerDecks?.players.map(p => [p.playerId, p.topChampions[0]?.name]) ?? []), [playerDecks]);
  const championImages = useChampionCardImages(playerId === undefined ? [...new Set(rows.flatMap(g => g.players.map(p => champions.get(p.playerId)).filter((name): name is string => !!name)))] : []);
  const namelessCard = useNamelessChampionCard();
  function change(action: () => void) { startTransition(() => { action(); setLimit(12); }); }
  return <Panel className="my-6 min-w-0">
    <h2 className="text-xl font-semibold">Best Players</h2>
    <PublishedSourceStatus label="Best players" status={status} hasData={!!data} />
    {data && <>
      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 flex-1 text-sm">Format<select className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={selectedFormat} onChange={e => change(() => setFormat(e.target.value))}>{(formats.length ? formats : [format]).map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="min-w-0 flex-1 text-sm">Season<select className="mt-1 block min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-3" value={selectedSeason} onChange={e => change(() => setSeason(e.target.value))}><option value="all">All time</option>{seasons.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </div>
      {pending && <p role="status">Recalculating…</p>}
      {!rows.length && <p className="text-sm text-ctp-subtext1">No qualifying rankings yet.</p>}
      <div className={playerId === undefined ? 'space-y-2' : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'}>
        {rows.slice(0, limit).map(group => <div key={group.card} className="min-w-0">
          {playerId !== undefined && (cards.get(group.card) ? <Link to={`/cards/${cards.get(group.card)!.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile name={group.card} card={cards.get(group.card)} /><span className="my-2 block break-words text-sm font-medium">{group.card}</span></Link> : <div><CardArtTile name={group.card} card={undefined} /><span className="my-2 block break-words text-sm font-medium">{group.card}</span></div>)}
          {playerId === undefined ? <ol aria-label="Best players" className="space-y-3">{group.players.map(p => <li key={p.playerId}>
            <PlayerSearchResult playerId={p.playerId} name={playerName(p.playerId)} rank={p.rank} championName={champions.get(p.playerId)} card={championImages.get(champions.get(p.playerId) ?? '') ?? namelessCard}>
              <div><strong className="text-lg tabular-nums">{p.score.toFixed(2)}</strong><span className="block text-xs text-ctp-subtext1">Points</span></div>
              <div><strong className="break-words text-sm tabular-nums">{p.wins}–{p.losses}–{p.ties}</strong><span className="block text-xs text-ctp-subtext1">Card W–L–T</span></div>
              <div><strong className="text-lg tabular-nums">{p.events}</strong><span className="block text-xs text-ctp-subtext1">Events</span></div>
            </PlayerSearchResult>
          </li>)}</ol> : group.players.filter(p => p.playerId === playerId).map(p => <div key={p.playerId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-ctp-surface0 py-2">
            <div className="min-w-0"><strong className="mr-2 text-ctp-yellow">#{p.rank}</strong>{playerId === undefined && <Link className="inline-flex min-h-control items-center break-words text-ctp-blue focus-visible:outline-2" to={`/players/${p.playerId}`}>{playerName(p.playerId)}</Link>}</div>
            <div className="text-sm"><strong>{p.score.toFixed(2)} pts</strong><span className="block text-xs text-ctp-subtext1">{p.events} events · {p.wins}–{p.losses}–{p.ties}</span></div>
          </div>)}
        </div>)}
      </div>
      {rows.length > limit && <Button className="mt-4" onClick={() => setLimit(n => n + 12)}>Show more cards</Button>}
    </>}
  </Panel>;
}
