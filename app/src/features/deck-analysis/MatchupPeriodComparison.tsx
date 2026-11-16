import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import { ChampionArt } from './AnalysisMatchups';
import { compareObservedMatchups, type Card, type ObservedMatchupData, type ObservedMatchupScope, type observedMatchupCohort } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';

type Cohort = ReturnType<typeof observedMatchupCohort>;
const rate = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;
export default function MatchupPeriodComparison({ current, previous, scope, previousScope, builds = {}, cards = new Map() }: {
  builds?: ObservedMatchupData['builds']; cards?: Map<string, Card>;
  current: Cohort; previous: Cohort; scope: ObservedMatchupScope; previousScope: ObservedMatchupScope;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowsId = useId();
  const rows = useMemo(() => compareObservedMatchups(current, previous), [current, previous]);
  const visible = expanded ? rows : rows.slice(0, 3);
  const delta = current.winRate !== null && previous.winRate !== null ? (current.winRate - previous.winRate) * 100 : null;
  return <Panel className="mt-4">
    <h2 className="font-semibold">Period comparison</h2>
    <p className="mt-1 text-sm text-ctp-subtext0">{scope.format || 'All formats'} · All events</p>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {([{ title: 'Previous', cohort: previous, range: previousScope }, { title: 'Selected', cohort: current, range: scope }]).map(({ title, cohort, range }) => <section key={title} aria-label={`${title} period`} className="min-w-0 rounded-lg bg-ctp-base p-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-ctp-subtext0">{range.from} – {range.to}</p>
        <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-3xl font-bold tabular-nums">{rate(cohort.winRate)}</p><p className="text-xs">Score rate</p></div><div className="text-right"><p className="text-3xl font-bold tabular-nums">{cohort.results.toLocaleString()}</p><p className="text-xs">Deck results</p></div></div>
        <div aria-hidden="true" className="my-3 h-2 overflow-hidden rounded-full bg-ctp-surface1"><div className="h-full bg-ctp-blue" style={{ width: `${(cohort.winRate ?? 0) * 100}%` }} /></div>
        <p className="text-xs text-ctp-subtext0">{cohort.decks.toLocaleString()} {cohort.decks === 1 ? 'deck' : 'decks'} · {cohort.events.toLocaleString()} {cohort.events === 1 ? 'event' : 'events'}</p>
      </section>)}
    </div>
    <p className="mt-3 text-sm">{delta === null ? 'No comparison · one period has no results' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} percentage points`}<span className="text-ctp-subtext0"> · Ties count ½</span></p>
    <h3 className="mt-5 font-semibold">By opponent</h3>
    <p className="mt-1 text-xs text-ctp-subtext0">Largest combined samples first · Score rate 0–100%</p>
    {rows.length === 0 && <p role="status" className="mt-3 text-sm">No recorded opponents in either period.</p>}
    <div id={rowsId} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {visible.map(row => <article key={row.id} className="min-w-0 rounded-lg bg-ctp-base p-3">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
          <ChampionArt name={builds[row.id]?.champion ?? 'Opponent'} cards={cards} />
          <Link to={`/archetypes/${row.id}`} className="flex min-h-12 items-center break-words text-sm font-semibold text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{builds[row.id]?.name ?? `Build ${row.id}`}</Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[{ label: 'Previous', value: row.previous }, { label: 'Selected', value: row.current }].map(({ label, value }) => <div key={label}>
            <p className="text-xs text-ctp-subtext0">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{rate(value?.winRate ?? null)}</p>
            <div aria-hidden="true" className="my-2 h-2 overflow-hidden rounded-full bg-ctp-surface1"><div className="h-full bg-ctp-blue" style={{ width: `${(value?.winRate ?? 0) * 100}%` }} /></div>
            <p className="text-sm"><strong className="tabular-nums">{(value?.matches ?? 0).toLocaleString()}</strong> {value?.matches === 1 ? 'match' : 'matches'}</p>
          </div>)}
        </div>
        <p className="mt-3 text-sm">{row.delta === null ? row.current ? 'Selected period only' : 'Previous period only' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)} percentage points`}</p>
      </article>)}
    </div>
    {rows.length > 3 && <Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} aria-controls={rowsId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Fewer opponent comparisons' : `All ${rows.length} opponent comparisons`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
  </Panel>;
}
