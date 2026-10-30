import { useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_TIME_STRENGTH_ID, ratingQuantile, STRENGTH_REGIONS, type RegionalStrengthData, type StrengthSeason } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import PublishedSourceStatus from '../../components/PublishedSourceStatus';
import Panel from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/ContentState';

const label = (region: string) => region.replace('us-', '').replace(/^./, c => c.toUpperCase());
const rounded = (value: number | null) => value === null ? '—' : Math.round(value).toLocaleString();
const percent = (n: number, d: number) => d ? `${(100*n/d).toFixed(1)}%` : '—';

function StrengthCharts({ report }: { report: StrengthSeason }) {
  const allTime = report.seasonId === ALL_TIME_STRENGTH_ID;
  const ratings = report.regions.flatMap(r => r.ratings);
  const min = ratings.length ? Math.floor(Math.min(...ratings)/100)*100 : 1000;
  const max = ratings.length ? Math.max(min+100,Math.ceil(Math.max(...ratings)/100)*100) : 2000;
  const x = (n: number) => 20 + 280*(n-min)/(max-min);
  return <div className="space-y-6">
    <div className="grid grid-cols-3 gap-2">{report.regions.map(r => <Panel key={r.region} padding="sm">
      <h3 className="font-semibold">{label(r.region)}</h3>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{r.active.toLocaleString()}</div>
      <p className="text-sm text-ctp-subtext0">{allTime ? 'recorded players' : 'active players'}</p>
    </Panel>)}</div>
    <section aria-labelledby="strength-head-to-head">
      <h2 id="strength-head-to-head" className="text-lg font-semibold">Cross-region results</h2>
      <p className="mb-3 text-sm text-ctp-subtext0">Row region’s win rate · W–L–D</p>
      <Panel padding="sm">
        <table className="w-full table-fixed text-center text-xs sm:text-sm">
          <thead><tr><th scope="col" className="w-1/6 py-3">vs.</th>{STRENGTH_REGIONS.map(r => <th scope="col" key={r}>{label(r)}</th>)}</tr></thead>
          <tbody>{STRENGTH_REGIONS.map(a => <tr key={a}><th scope="row" className="py-5">{label(a)}</th>{STRENGTH_REGIONS.map(b => {
            const pair = report.pairs.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
            if (a === b) return <td key={b} aria-label="Same region">—</td>;
            if (!pair) return <td key={b}>No matches</td>;
            const wins = pair.a === a ? pair.wins : pair.losses, losses = pair.a === a ? pair.losses : pair.wins;
            const n = wins+losses+pair.draws;
            return <td key={b} className={`rounded-lg px-1 py-4 ${wins > losses ? 'bg-ctp-blue/15' : 'bg-ctp-surface0/50'}`}>
              <div className="text-base font-semibold tabular-nums sm:text-xl">{percent(wins,n)}</div>
              <div className="mt-1 tabular-nums">{wins}–{losses}–{pair.draws}</div>
              <div className="mt-1 text-ctp-subtext0">{pair.events} {pair.events === 1 ? "event" : "events"}</div>
              {n < 30 && <div className="mt-1 text-ctp-subtext0">Small sample</div>}
            </td>;
          })}</tr>)}</tbody>
        </table>
      </Panel>
      <p className="mt-2 text-xs text-ctp-subtext0">{report.pairingEvents} of {report.events} events have recorded matches · {report.unassigned} {allTime ? 'recorded' : 'active'} US players unassigned</p>
    </section>
    <section aria-labelledby="strength-ratings">
      <h2 id="strength-ratings" className="text-lg font-semibold">Rating depth</h2>
      <p className="mb-3 text-sm text-ctp-subtext0">{allTime ? 'Current Elo · 10+ recorded matches in this format' : 'Overall Elo · players with 10+ matches this season and format'}</p>
      <div className="grid gap-3 sm:grid-cols-3">{report.regions.map(r => {
        const q1=ratingQuantile(r.ratings,.25),q3=ratingQuantile(r.ratings,.75),median=ratingQuantile(r.ratings,.5),top=ratingQuantile(r.ratings,.9);
        return <Panel key={r.region}><h3 className="font-semibold">{label(r.region)} <span className="font-normal text-ctp-subtext0">· {r.ratings.length} players</span></h3>
          {median === null ? <p className="py-6 text-sm text-ctp-subtext0">No established ratings</p> : <>
            <svg viewBox="0 0 320 76" className="mt-3 w-full" role="img" aria-label={`${label(r.region)} rating distribution: median ${rounded(median)}, middle half ${rounded(q1)} to ${rounded(q3)}, top ten percent starts at ${rounded(top)}`}>
              <line x1="20" x2="300" y1="28" y2="28" stroke="currentColor" opacity=".2" />
              <rect x={x(q1!)} y="16" width={Math.max(2,x(q3!)-x(q1!))} height="24" rx="4" className="fill-ctp-blue/35" />
              <line x1={x(median)} x2={x(median)} y1="12" y2="44" className="stroke-ctp-blue" strokeWidth="3" />
              <circle cx={x(top!)} cy="28" r="5" className="fill-ctp-mauve" />
              <text x="20" y="65" fontSize="12" fill="currentColor">{min}</text><text x="300" y="65" textAnchor="end" fontSize="12" fill="currentColor">{max}</text>
            </svg>
            <dl className="flex justify-between gap-3 text-sm"><div><dt className="text-ctp-subtext0">Median</dt><dd className="text-xl font-semibold">{rounded(median)}</dd></div><div className="text-right"><dt className="text-ctp-subtext0">Top 10% starts</dt><dd className="text-xl font-semibold">{rounded(top)}</dd></div></dl>
          </>}
        </Panel>;
      })}</div>
      {ratings.length > 0 && <p className="mt-2 text-xs text-ctp-subtext0">Box: middle 50% · line: median · dot: top 10% threshold</p>}
    </section>
    <section aria-labelledby="strength-majors">
      <h2 id="strength-majors" className="text-lg font-semibold">Major-event top cuts</h2>
      <p className="mb-3 text-sm text-ctp-subtext0">Top cuts per entry · {report.coveredMajorEvents} of {report.majorEvents} majors with complete standings and a verified cut</p>
      {!report.coveredMajorEvents ? <EmptyState title="No verified major-event cuts in this selection" /> : <Panel><div className="space-y-5">{report.regions.map(r => <div key={r.region}>
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><strong>{label(r.region)}</strong><span>{percent(r.topCuts,r.majorEntries)} · {r.topCuts}/{r.majorEntries} entries</span></div>
        <div className="h-3 rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-mauve" style={{width:`${r.majorEntries ? 100*r.topCuts/r.majorEntries : 0}%`}} /></div>
      </div>)}</div></Panel>}
    </section>
  </div>;
}

export default function RegionalStrength() {
  const data = usePublishedData<RegionalStrengthData>('regional-strength','/data/analysis/regional-strength.json');
  const status = usePublishedDataStatus('regional-strength','/data/analysis/regional-strength.json');
  const [params,setParams] = useSearchParams();
  const [pending,startTransition] = useTransition();
  const latestParams = useRef(params);
  useEffect(() => { latestParams.current = params; }, [params]);
  const seasons = [...new Map(data?.seasons.map(s => [s.seasonId,s.name]) ?? []).entries()];
  const requested = Number(params.get('strengthSeason'));
  const season = seasons.some(([id]) => id === requested) ? requested : seasons[0]?.[0];
  const formats = [...new Set(data?.seasons.filter(s => s.seasonId === season).map(s => s.format))];
  const format = formats.includes(params.get('strengthFormat') ?? '') ? params.get('strengthFormat')! : formats.includes('standard') ? 'standard' : formats[0];
  const report = data?.seasons.find(s => s.seasonId === season && s.format === format);
  const change = (key: string,value: string) => {
    const next = new URLSearchParams(latestParams.current);
    next.set(key,value);
    latestParams.current = next;
    startTransition(() => setParams(next));
  };
  return <div className="mt-4" aria-busy={pending}>
    <PublishedSourceStatus label="Regional strength" status={status} hasData={!!data} />
    {data && !data.seasons.length && <EmptyState title="No regional strength results yet" />}
    {report && <>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="min-w-0 flex-1 text-sm">Period<select className="mt-1 block min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={season} onChange={e => change('strengthSeason',e.target.value)}>{seasons.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="min-w-0 text-sm">Format<select className="mt-1 block min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={format} onChange={e => change('strengthFormat',e.target.value)}>{formats.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
      </div>
      {pending && <p role="status">Recalculating…</p>}
      <p className="mb-3 text-xs text-ctp-subtext0">{report.seasonId === ALL_TIME_STRENGTH_ID ? 'Current inferred US regions · all recorded results' : 'US play regions inferred'} through {report.asOf.slice(0,10)}</p>
      <StrengthCharts report={report} />
    </>}
  </div>;
}
