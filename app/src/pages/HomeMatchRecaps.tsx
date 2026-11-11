import { Link } from "react-router-dom";
import MatchIdentity from "../features/timelines/MatchIdentity";
import TimelineStatus from "../features/timelines/TimelineStatus";
import { useBroadcastTimelines } from "../features/timelines/data";
import { roundLabel, useTimelineChampions } from "../features/timelines/champions";

export default function HomeMatchRecaps() {
  const data = useBroadcastTimelines();
  const champions = useTimelineChampions();
  const matches = data?.matches.slice(0, 2) ?? [];
  return <section aria-labelledby="home-recaps-heading" className="border-b border-ctp-surface0 px-4 py-8 sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Match timelines</p>
      <h2 id="home-recaps-heading" className="mt-3 text-xl font-bold sm:text-2xl">Catch up on the key plays</h2>
      <p className="mt-3 text-sm text-ctp-subtext1">Explore broadcast match recaps, game by game, with the players and cards in view.</p>
      <TimelineStatus loading={!data} />
      {data && !matches.length && <p className="mt-4 text-sm text-ctp-subtext1">Match recaps are on the way.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">{matches.map(match => <Link key={match.id} to={`/timelines/${match.id}`} aria-label={`Read ${match.players.map(player => player.name).join(" versus ")} recap`} className="min-w-0 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
        <p className="mb-4 text-sm text-ctp-subtext1">{match.event} · {roundLabel(match.round)}</p>
        <MatchIdentity match={match} champions={champions} />
        <p className="mt-4 border-t border-ctp-surface1 pt-3 text-sm font-semibold text-ctp-blue">Read match recap →</p>
      </Link>)}</div>
      <Link to="/timelines" className="mt-4 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore all match timelines →</Link>
    </div>
  </section>;
}
