import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import MatchIdentity from './MatchIdentity';
import { roundLabel } from './champions';
import { groupTimelineResults } from './timelineResultGroups';

export default function GroupedResults({ groups, champions }: { groups: ReturnType<typeof groupTimelineResults>; champions?: Card[] }) {
  return <div className="space-y-8">{groups.map(group => <section key={group.key} aria-label={group.name}>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl font-bold">{group.name}</h2><p className="text-xs text-ctp-subtext1">{group.event?.date && `${new Date(group.event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} · `}{group.matches.length} {group.matches.length === 1 ? 'match' : 'matches'}</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.matches.map(match => {
      const pairing = group.event?.stages.flatMap(stage => stage.matches).find(m => m.recapId === match.id);
      const spirits = Object.fromEntries((pairing?.players ?? []).map(p => [p.name.toLowerCase(), p.spirits ?? []]));
      return <Link key={match.id} to={`/timelines/${match.id}`} className="min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ctp-blue">
        <Panel elevation={1} padding="md" className="h-full transition-colors hover:bg-ctp-surface1"><p className="mb-3 text-xs text-ctp-subtext1">{roundLabel(match.round)}</p><MatchIdentity match={match} champions={champions} spirits={spirits} /><p className="mt-4 border-t border-ctp-surface1 pt-3 text-sm font-medium">{match.result}</p></Panel>
      </Link>;
    })}</div>
  </section>)}</div>;
}
