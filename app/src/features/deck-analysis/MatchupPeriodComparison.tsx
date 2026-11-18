import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import { ChampionArt } from './AnalysisMatchups';
import { compareObservedMatchups, type Card, type ObservedMatchupData, type ObservedMatchupScope, type observedMatchupCohort } from '@gatcg/shared';
import RateTrack, { EventRangeLabel, rangeLegend } from './ObservedRateTrack';
import Panel from '../../components/ui/Panel';

type Cohort = ReturnType<typeof observedMatchupCohort>;
const rate = (value: number | null) => value === null ? <><span aria-hidden="true">—</span><span className="sr-only">No recorded matches</span></> : <><span className="sr-only">Score rate </span>{`${Math.round(value * 100)}%`}</>;
export default function MatchupPeriodComparison({ current, previous, scope, previousScope, builds = {}, cards = new Map() }: {
  builds?: ObservedMatchupData['builds']; cards?: Map<string, Card>;
  current: Cohort; previous: Cohort; scope: ObservedMatchupScope; previousScope: ObservedMatchupScope;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowsId = useId();
  const rows = useMemo(() => compareObservedMatchups(current, previous), [current, previous]);
  const visible = expanded ? rows : rows.slice(0, 3);
  const delta = current.winRate !== null && previous.winRate !== null ? (current.winRate - previous.winRate) * 100 : null;
  if (!current.results && !previous.results) return null;
  return <Panel className="mt-4">
    <h2 className="font-semibold">Period comparison</h2>
    <p className="mt-1 text-sm text-ctp-subtext0">{scope.format || 'All formats'} · All events · Score rate</p>
    <div className="mt-3 divide-y divide-ctp-surface1">
      {([{ title: 'Previous', cohort: previous, range: previousScope }, { title: 'Selected', cohort: current, range: scope }]).map(({ title, cohort, range }) => <section key={title} aria-label={`${title} period`} className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-6">
        <div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-ctp-subtext0">{range.from} – {range.to}</p></div>
        <div><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-2xl tabular-nums">{rate(cohort.winRate)}</strong><span className="text-xs text-ctp-subtext0">{cohort.results.toLocaleString()} deck results</span></div>
          <RateTrack value={cohort.winRate} />
          <p className="text-xs text-ctp-subtext0">{cohort.decks.toLocaleString()} {cohort.decks === 1 ? 'deck' : 'decks'} · {cohort.events.toLocaleString()} {cohort.events === 1 ? 'event' : 'events'}</p>
        </div>
      </section>)}
    </div>
    {delta !== null && <p className="mt-3 text-sm">{`${delta > 0 ? '+' : ''}${delta.toFixed(1)} percentage points`}<span className="text-ctp-subtext0"> · Ties count ½</span></p>}
    {rows.length > 0 && <>
    <h3 className="mt-5 font-semibold">By opponent</h3>
    <p className="mt-1 text-xs text-ctp-subtext0">Largest combined samples first · Score rate 0–100%</p>
    {rows.some(row => [row.current, row.previous].some(value => value?.eventRange && value.eventRange.events > 1)) && <p className="mt-1 text-xs text-ctp-subtext0">{rangeLegend}</p>}
    <div id={rowsId} className="mt-3 divide-y divide-ctp-surface1 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-base">
      {visible.map(row => <article key={row.id} aria-label={`Against ${builds[row.id]?.name ?? `Build ${row.id}`}`} className="grid min-w-0 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-6 sm:p-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-20 shrink-0"><ChampionArt name={builds[row.id]?.champion ?? 'Opponent'} cards={cards} /></div>
            <div className="min-w-0"><h4 className="break-words font-semibold">{builds[row.id]?.champion ?? 'Opponent'}</h4><Link to={`/archetypes/${row.id}`} className="flex min-h-12 items-center break-words text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{builds[row.id]?.name ?? `Build ${row.id}`}</Link></div>
          </div>
          <p className="mt-2 text-sm tabular-nums">{row.delta === null ? row.current ? 'Selected period only' : 'Previous period only' : <>{`${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}`}<span aria-hidden="true"> pp</span><span className="sr-only"> percentage points, selected minus previous</span></>}</p>
        </div>
        <div className="min-w-0 space-y-3">
          {[{ label: 'Previous', value: row.previous }, { label: 'Selected', value: row.current }].map(({ label, value }) => <div key={label}>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-xs text-ctp-subtext0">{label} <strong className="ml-1 text-lg text-ctp-text tabular-nums">{rate(value?.winRate ?? null)}</strong></span><span className="text-xs text-ctp-subtext0 tabular-nums">{(value?.matches ?? 0).toLocaleString()} {value?.matches === 1 ? 'match' : 'matches'}{value?.eventRange ? ` · ${value.eventRange.events} ${value.eventRange.events === 1 ? 'event' : 'events'}` : ''}</span></div>
            <RateTrack value={value?.winRate ?? null} range={value?.eventRange} />
            <EventRangeLabel range={value?.eventRange} />
          </div>)}
          <div aria-hidden="true" className="flex justify-between text-xs text-ctp-subtext0"><span>0%</span><span>50%</span><span>100%</span></div>
        </div>
      </article>)}
    </div>
    </>}
    {rows.length > 3 && <Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} aria-controls={rowsId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Fewer opponent comparisons' : `All ${rows.length} opponent comparisons`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
  </Panel>;
}
