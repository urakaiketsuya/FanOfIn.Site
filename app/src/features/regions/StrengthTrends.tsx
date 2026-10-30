import { ALL_TIME_STRENGTH_ID, ratingQuantile, STRENGTH_REGIONS, type StrengthSeason } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/ContentState';

const names = ['East', 'Central', 'West'];
const colors = ['var(--color-ctp-blue)', 'var(--color-ctp-peach)', 'var(--color-ctp-mauve)'];
const dashes = ['', '7 4', '2 4'];

export default function StrengthTrends({ reports, format, selected, metric, onMetric, onSelect }: {
  reports: StrengthSeason[]; format: string; selected: number; metric: string;
  onMetric: (metric: string) => void; onSelect: (season: number) => void;
}) {
  const mode = ['median', 'top', 'cuts'].includes(metric) ? metric : 'median';
  const seasons = reports.filter(r => r.format === format && r.seasonId !== ALL_TIME_STRENGTH_ID)
    .sort((a,b) => a.asOf.localeCompare(b.asOf) || a.seasonId-b.seasonId);
  const series = STRENGTH_REGIONS.map(region => seasons.map(s => {
    const row = s.regions.find(r => r.region === region);
    if (!row) return null;
    return mode === 'cuts' ? (row.majorEntries ? 100*row.topCuts/row.majorEntries : null)
      : ratingQuantile(row.ratings, mode === 'top' ? .9 : .5);
  }));
  const values = series.flat().filter((v): v is number => v !== null);
  const low = mode === 'cuts' ? 0 : Math.floor((Math.min(...values)-20)/50)*50;
  const high = mode === 'cuts' ? Math.max(10, Math.ceil(Math.max(0,...values)/10)*10) : Math.max(low+100, Math.ceil((Math.max(...values)+20)/50)*50);
  const x = (i: number) => seasons.length === 1 ? 320 : 55+i*555/(seasons.length-1);
  const y = (v: number) => 205-(v-low)/(high-low)*175;
  const display = (v: number | null) => v === null ? '—' : mode === 'cuts' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();
  const selectedIndex = seasons.findIndex(s => s.seasonId === selected);
  return <section className="mb-6" aria-labelledby="strength-trends">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 id="strength-trends" className="text-lg font-semibold">Across seasons</h2>
      <label className="text-sm">Measure<select value={mode} onChange={e => onMetric(e.target.value)} className="ml-2 min-h-control rounded-lg border border-ctp-surface1 bg-ctp-base px-2">
        <option value="median">Median Elo</option><option value="top">Top 10% Elo</option><option value="cuts">Top-cut conversion</option>
      </select></label>
    </div>
    {!values.length ? <EmptyState title="No seasonal results for this measure" /> : <Panel>
      <div className="flex flex-wrap gap-4 text-sm">{names.map((name,i) => <span key={name} className="inline-flex items-center gap-2"><svg width="24" height="12" aria-hidden="true"><line x1="0" x2="24" y1="6" y2="6" stroke={colors[i]} strokeWidth="3" strokeDasharray={dashes[i]} /></svg>{name}</span>)}</div>
      <svg viewBox="0 0 640 245" className="mx-auto w-full max-w-3xl" role="img" aria-label={`${mode === 'cuts' ? 'Top-cut conversion' : mode === 'top' ? 'Top ten percent Elo' : 'Median Elo'} by season. Select a season below for values and regional results.`}>
        {[low,(low+high)/2,high].map(v => <g key={v}><line x1="55" x2="610" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".15" /><text x="47" y={y(v)+4} textAnchor="end" fill="currentColor" fontSize="13">{Math.round(v)}{mode === 'cuts' ? '%' : ''}</text></g>)}
        {selectedIndex >= 0 && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1="25" y2="210" stroke="currentColor" opacity=".3" />}
        {series.map((points,r) => <g key={names[r]}>
          <path d={points.map((v,i) => v === null ? '' : `${i === 0 || points[i-1] === null ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')} fill="none" stroke={colors[r]} strokeWidth="3" strokeDasharray={dashes[r]} />
          {points.map((v,i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={selectedIndex === i ? 5 : 3} fill={colors[r]} />)}
        </g>)}
        {seasons.map((s,i) => <text key={s.seasonId} x={x(i)} y="233" textAnchor="middle" fill="currentColor" fontSize="13">{i+1}</text>)}
      </svg>
      <div className="flex flex-wrap gap-2" aria-label="Select a season">{seasons.map((s,i) => <Button key={s.seasonId} size="sm" variant={selected === s.seasonId ? 'primary' : 'secondary'} aria-pressed={selected === s.seasonId} onClick={() => onSelect(s.seasonId)}>{i+1} · {s.name}</Button>)}</div>
      {selectedIndex >= 0 && <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">{names.map((name,r) => <div key={name}><dt className="text-ctp-subtext0">{name}</dt><dd className="text-xl font-semibold tabular-nums">{display(series[r][selectedIndex])}</dd></div>)}</dl>}
    </Panel>}
  </section>;
}
