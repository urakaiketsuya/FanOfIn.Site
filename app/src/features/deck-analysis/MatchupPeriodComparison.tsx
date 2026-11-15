import type { ObservedMatchupScope, observedMatchupCohort } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';

type Cohort = ReturnType<typeof observedMatchupCohort>;
const rate = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;
export default function MatchupPeriodComparison({ current, previous, scope, previousScope }: {
  current: Cohort; previous: Cohort; scope: ObservedMatchupScope; previousScope: ObservedMatchupScope;
}) {
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
  </Panel>;
}
