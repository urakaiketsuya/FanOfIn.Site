import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { assignUSPlayerRegions, comparePlayerResults, ratingQuantile, regionalPercentile, recordSize, STRENGTH_REGIONS,
  type PlayerComparisonData, type PlayerComparisonRow, type RegionalStrengthData, type RecordCount } from '@gatcg/shared';
import { useOmnidexIndex, useOmnidexPlayers } from '../tournaments/data';
import { useEloHistoryData } from './data';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const regionName = (r: string) => r === 'unassigned' ? 'Other / unassigned' : r.replace('us-','').replace(/^./, c => c.toUpperCase());
const number = (v: number | null) => v === null ? '—' : Math.round(v).toLocaleString();
const control = 'block mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3';
function RecordBar({record}: {record: RecordCount}) {
  const n = recordSize(record);
  return <div><p className="text-sm tabular-nums">{record.wins}W · {record.losses}L · {record.ties}D <span className="text-ctp-subtext0">· {n} matches{n > 0 && n < 30 ? ' · Small sample' : ''}</span></p>
    {n > 0 && <div className="mt-2 flex h-3 overflow-hidden rounded-full" aria-hidden="true"><div className="bg-ctp-blue" style={{width:`${100*record.wins/n}%`}}/><div className="bg-ctp-red" style={{width:`${100*record.losses/n}%`}}/><div className="bg-ctp-overlay1" style={{width:`${100*record.ties/n}%`}}/></div>}
  </div>;
}
function OpponentPlot({row, min, max}: {row:PlayerComparisonRow; min:number; max:number}) {
  const rated = row.matches.filter(m => m.opponentRating !== null);
  return <div><h4 className="mb-1 text-sm font-medium">Opponent pre-event Elo</h4>
    {!rated.length ? <p className="text-sm text-ctp-subtext0">No earlier opponent ratings</p> : <svg viewBox="0 0 360 140" className="w-full" role="img" aria-label={`${rated.length} matches with earlier opponent ratings, plotted by win, loss or draw`}>
      {(['wins','losses','ties'] as const).map((result,i) => <g key={result}><text x="0" y={25+i*35} fontSize="12" fill="currentColor">{['Wins','Losses','Draws'][i]}</text><line x1="50" x2="340" y1={21+i*35} y2={21+i*35} stroke="currentColor" opacity=".15" />
        {rated.filter(m => m.result === result).map((m,j) => <circle key={`${m.eventId}-${j}`} cx={50+290*(m.opponentRating!-min)/(max-min)} cy={21+i*35+(j%3-1)*4} r="3" opacity=".55" className={i===0 ? 'fill-ctp-blue' : i===1 ? 'fill-ctp-red' : 'fill-ctp-overlay1'}><title>{number(m.opponentRating)} Elo · event {m.eventId}</title></circle>)}
      </g>)}<text x="50" y="130" fontSize="12" fill="currentColor">{min}</text><text x="340" y="130" textAnchor="end" fontSize="12" fill="currentColor">{max}</text>
    </svg>}
    <p className="text-xs text-ctp-subtext0">{rated.length}/{row.matches.length} matches with earlier ratings</p>
  </div>;
}
function RegionPosition({rating,pool}: {rating:number;pool:number[]}) {
  const low = Math.floor(Math.min(rating,...pool)/100)*100;
  const high = Math.max(low+100,Math.ceil(Math.max(rating,...pool)/100)*100);
  const x = (v:number) => 25+300*(v-low)/(high-low);
  const q1=ratingQuantile(pool,.25)!, q3=ratingQuantile(pool,.75)!, median=ratingQuantile(pool,.5)!;
  return <svg viewBox="0 0 350 110" className="w-full max-w-lg" role="img" aria-label={`Player Elo ${number(rating)}; regional median ${number(median)}; middle half ${number(q1)} to ${number(q3)}`}>
    <line x1="25" x2="325" y1="48" y2="48" stroke="currentColor" opacity=".3"/>
    <rect x={x(q1)} y="35" width={Math.max(2,x(q3)-x(q1))} height="26" rx="4" className="fill-ctp-mauve/40"/>
    <line x1={x(median)} x2={x(median)} y1="30" y2="65" className="stroke-ctp-mauve" strokeWidth="3"/>
    <circle cx={x(rating)} cy="48" r="6" className="fill-ctp-blue"/>
    <text x={Math.max(65,Math.min(285,x(rating)))} y="20" textAnchor="middle" fill="currentColor" fontSize="12">Player {number(rating)}</text>
    <text x="25" y="83" fill="currentColor" fontSize="12">{low}</text><text x="325" y="83" textAnchor="end" fill="currentColor" fontSize="12">{high}</text>
    <text x="175" y="105" textAnchor="middle" fill="currentColor" fontSize="12">Middle 50% · median {number(median)}</text>
  </svg>;
}
export default function PlayerComparison({playerId}: {playerId:number}) {
  const players = useOmnidexPlayers(), index = useOmnidexIndex(), history = useEloHistoryData();
  const data = usePublishedData<PlayerComparisonData>('player-comparison','/data/analysis/player-comparison.json');
  const strength = usePublishedData<RegionalStrengthData>('regional-strength','/data/analysis/regional-strength.json');
  const status = usePublishedDataStatus('player-comparison','/data/analysis/player-comparison.json');
  const historyStatus = usePublishedDataStatus('analysis-elo-history','/data/analysis/elo-history.json');
  const strengthStatus = usePublishedDataStatus('regional-strength','/data/analysis/regional-strength.json');
  const indexStatus = usePublishedDataStatus('omnidex-index','/data/omnidex/index.json');
  const [params,setParams] = useSearchParams(), [pending,startTransition] = useTransition();
  const latest = useRef(params); useEffect(()=>{latest.current=params;},[params]);
  const [query,setQuery] = useState('');
  const change = (key:string,value:string) => {const next=new URLSearchParams(latest.current);next.set(key,value);latest.current=next;startTransition(()=>setParams(next));};
  const season = Number(params.get('compareSeason') ?? 0);
  const format = params.get('compareFormat') ?? 'standard';
  const report = strength?.seasons.find(s=>s.seasonId===season && s.format===format);
  const target = params.get('compareTarget') ?? 'us-east';
  const opponentId = /^\d+$/.test(target) && Number(target)!==playerId ? Number(target) : null;
  const assignments = useMemo(()=>index && players && report ? assignUSPlayerRegions(players.players,index.events.filter(e=>Date.parse(e.date)<=Date.parse(report.asOf)),[],report.asOf) : undefined,[index,players,report]);
  const rows = useMemo(()=>data && index && history && report && assignments ? comparePlayerResults(data,index,history,
    opponentId ? [playerId,opponentId] : [playerId],format,season,report.asOf,id=>assignments.get(id)?.region ?? null) : [],[data,index,history,report,assignments,opponentId,playerId,format,season]);
  const names = useMemo(()=>new Map(players?.players.map(p=>[p.id,p.username]) ?? []),[players]);
  const name = (id:number) => names.get(id) ?? `Player #${id}`;
  const matches = query.trim() ? players?.players.filter(p=>p.id!==playerId && p.username.toLowerCase().includes(query.trim().toLowerCase())).slice(0,10) ?? [] : [];
  const selectedRegion = STRENGTH_REGIONS.includes(target as typeof STRENGTH_REGIONS[number]) ? target : 'us-east';
  const pool = report?.regions.find(r=>r.region===selectedRegion)?.ratings ?? [];
  const direct = rows[0]?.opponents.find(r=>r.playerId===opponentId)?.record;
  const common = rows.length===2 ? rows[0].opponents.flatMap(a=> {const b=rows[1].opponents.find(b=>b.playerId===a.playerId);return b ? [{id:a.playerId,a:a.record,b:b.record}] : [];}).sort((a,b)=>recordSize(b.a)+recordSize(b.b)-recordSize(a.a)-recordSize(a.b)) : [];
  const ratings = rows.flatMap(r=>r.matches.flatMap(m=>m.opponentRating===null ? [] : [m.opponentRating]));
  const min = ratings.length ? Math.floor(Math.min(...ratings)/100)*100 : 1000, max = ratings.length ? Math.max(min+100,Math.ceil(Math.max(...ratings)/100)*100) : 2000;
  return <section className="my-6 space-y-5" aria-label="Compare player" aria-busy={pending}>
    <PublishedSourceStatus label="Comparison matches" status={status} hasData={!!data}/>
    <PublishedSourceStatus label="Rating history" status={historyStatus} hasData={!!history}/>
    <PublishedSourceStatus label="Regional ratings" status={strengthStatus} hasData={!!strength}/>
    <PublishedSourceStatus label="Events" status={indexStatus} hasData={!!index}/>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Period<select className={control} value={season} onChange={e=>change('compareSeason',e.target.value)}>{[...new Map(strength?.seasons.map(s=>[s.seasonId,s.name]) ?? []).entries()].map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <label className="text-sm">Format<select className={control} value={format} onChange={e=>change('compareFormat',e.target.value)}>{[...new Set(strength?.seasons.map(s=>s.format))].map(f=><option key={f}>{f}</option>)}</select></label>
      <label className="text-sm">Compare with<select className={control} value={opponentId || target==='player' ? 'player' : selectedRegion} onChange={e=>change('compareTarget',e.target.value)}><option value="player">Another player</option>{STRENGTH_REGIONS.map(r=><option key={r} value={r}>{regionName(r)} region</option>)}</select></label>
    </div>
    {(opponentId || target==='player') && <div><label className="text-sm">Find player<input className={control} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search player name" /></label>
      {query.trim() && <div className="mt-2 flex flex-wrap gap-2">{matches.map(p=><Button key={p.id} className="max-w-full break-words" onClick={()=>{change('compareTarget',String(p.id));setQuery('');}}>{p.username} · #{p.id} · {regionName(assignments?.get(p.id)?.region ?? 'unassigned')}</Button>)}{!matches.length && <p>No matching players</p>}</div>}
    </div>}
    {pending && <p role="status">Recalculating…</p>}
    {strength && !report && <p>No results for this period and format.</p>}
    {report && <p className="text-xs text-ctp-subtext0">{report.name} · {format} · through {report.asOf.slice(0,10)} · Overall Elo, 5+ matches in selection</p>}
    <div className="grid gap-4 md:grid-cols-2">{rows.map(row=><Panel key={row.playerId} className="space-y-4">
      <div><Link className="inline-flex min-h-control items-center text-lg font-semibold text-ctp-blue" to={`/players/${row.playerId}`}>{name(row.playerId)}</Link><p className="text-sm text-ctp-subtext0">{regionName(assignments?.get(row.playerId)?.region ?? 'unassigned')}</p></div>
      <div className="flex flex-wrap items-baseline gap-3"><strong className="text-3xl">{number(row.rating)}</strong><span className="text-sm">Elo</span>{row.rating===null && <span className="text-xs text-ctp-subtext0">No eligible rating</span>}</div>
      <p className="text-sm text-ctp-subtext0">Regional percentile {number(regionalPercentile(row.rating, report?.regions.find(r=>r.region===assignments?.get(row.playerId)?.region)?.ratings ?? []))}</p>
      <RecordBar record={row.record}/><OpponentPlot row={row} min={min} max={max}/>
    </Panel>)}</div>
    {!opponentId && target!=='player' && rows[0] && <Panel className="space-y-4"><h3 className="font-semibold">{name(playerId)} vs. {regionName(selectedRegion)}</h3>
      <div><p className="text-2xl font-semibold">{number(regionalPercentile(rows[0].rating,pool))}<span className="ml-2 text-sm font-normal">regional percentile</span></p><p className="text-xs text-ctp-subtext0">{pool.length} eligible players</p>
        {rows[0].rating!==null && pool.length>0 && <RegionPosition rating={rows[0].rating} pool={pool}/>}
      </div><h4 className="text-sm font-medium">Direct results against this region</h4><RecordBar record={rows[0].regions.find(r=>r.region===selectedRegion)?.record ?? {wins:0,losses:0,ties:0}}/>
    </Panel>}
    {opponentId && rows.length===2 && <Panel className="space-y-4"><h3 className="font-semibold">Head to head · {name(playerId)}’s results</h3>{direct ? <RecordBar record={direct}/> : <p className="text-sm text-ctp-subtext0">No recorded meetings in this selection</p>}
      <h3 className="font-semibold">Common opponents · {common.length}</h3>{!common.length && <p className="text-sm text-ctp-subtext0">No common opponents in this selection</p>}
      {common.slice(0,10).map(c=><div key={c.id} className="border-t border-ctp-surface1 pt-3"><Link className="inline-flex min-h-control items-center text-sm text-ctp-blue" to={`/players/${c.id}`}>{name(c.id)}</Link><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs">{name(playerId)}</p><RecordBar record={c.a}/></div><div><p className="mb-1 text-xs">{name(opponentId)}</p><RecordBar record={c.b}/></div></div></div>)}
      {common.length>10 && <p className="text-xs text-ctp-subtext0">10 most-played common opponents shown</p>}
    </Panel>}
    {rows.map(row=><Panel key={row.playerId}><h3 className="mb-4 font-semibold">{name(row.playerId)} · by opponent region</h3><div className="grid gap-5 sm:grid-cols-2">{row.regions.map(r=><div key={r.region}><h4 className="mb-2 text-sm font-medium">{regionName(r.region)}</h4><RecordBar record={r.record}/><p className="mt-2 text-xs text-ctp-subtext0">Average pre-event opponent Elo {number(r.opponentRating)} · {r.ratedMatches}/{recordSize(r.record)} rated</p></div>)}</div>{!row.regions.length && <p className="text-sm text-ctp-subtext0">No recorded matches</p>}</Panel>)}
  </section>;
}
