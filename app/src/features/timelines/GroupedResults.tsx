import { memo, useMemo, useState, useTransition } from "react";
import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import MatchVideoLink from './MatchVideoLink';
import MatchIdentity from './MatchIdentity';
import { roundLabel } from './champions';
import { groupTimelineResults } from './timelineResultGroups';

function GroupedResults({ groups, champions }: { groups: ReturnType<typeof groupTimelineResults>; champions?: Card[] }) {
  const [page, setPage] = useState({ groups, count: 24 });
  const [pending, startTransition] = useTransition();
  const count = page.groups === groups ? page.count : 24;
  const total = groups.reduce((sum, group) => sum + group.matches.length, 0);
  let remaining = count;
  const visibleGroups = groups.flatMap(group => {
    const matches = group.matches.slice(0, Math.max(0, remaining));
    remaining -= group.matches.length;
    return matches.length ? [{ ...group, matches, total: group.matches.length }] : [];
  });
  const pairings = useMemo(() => new Map(groups.flatMap(group => group.event?.stages.flatMap(stage => stage.matches.filter(match => match.recapId).map(match => [match.recapId, match] as const)) ?? [])), [groups]);
  return <div className="space-y-8">{visibleGroups.map(group => <section key={group.key} aria-label={group.name}>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl font-bold">{group.name}</h2><p className="text-xs text-ctp-subtext1">{group.event?.date && `${new Date(group.event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} · `}{group.total} {group.total === 1 ? 'match' : 'matches'}</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.matches.map(match => {
      const pairing = pairings.get(match.id);
      const spirits = Object.fromEntries((pairing?.players ?? []).map(p => [p.name.toLowerCase(), p.spirits ?? []]));
      return <div key={match.id} className="flex min-w-0 flex-col"><Link to={`/timelines/${match.id}`} className="min-w-0 flex-1 rounded-xl focus-visible:outline-2 focus-visible:outline-ctp-blue">
        <Panel elevation={1} padding="md" className="h-full transition-colors hover:bg-ctp-surface1"><p className="mb-3 text-xs text-ctp-subtext1">{roundLabel(match.round)}</p><MatchIdentity match={match} champions={champions} spirits={spirits} /><p className="mt-4 border-t border-ctp-surface1 pt-3 text-sm font-medium">{match.result}</p></Panel>
      </Link><div className="mt-1"><MatchVideoLink match={match} /></div></div>;
    })}</div>
  </section>)}{count < total && <div className="flex items-center gap-3"><Button disabled={pending} onClick={() => startTransition(() => setPage({ groups, count: count + 24 }))}>{pending ? 'Loading…' : 'Show more matches'}</Button><span className="text-sm text-ctp-subtext1">{Math.min(count, total)} / {total}</span></div>}</div>;
}

export default memo(GroupedResults);
