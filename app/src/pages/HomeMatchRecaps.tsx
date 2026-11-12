import { useHomeReveal } from "./useHomeReveal";
import { Link } from "react-router-dom";
import MatchIdentity from "../features/timelines/MatchIdentity";
import TimelineStatus from "../features/timelines/TimelineStatus";
import { useBroadcastTimelines } from "../features/timelines/data";
import { roundLabel, useTimelineChampions } from "../features/timelines/champions";

export default function HomeMatchRecaps() {
  const data = useBroadcastTimelines();
  const champions = useTimelineChampions();
  const reveal = useHomeReveal<HTMLDivElement>(Boolean(data?.matches.length && champions?.length));
  const matches = data?.matches.slice(0, 2) ?? [];
  return <section aria-labelledby="home-recaps-heading" className="min-w-0">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Match timelines</p>
      <h2 id="home-recaps-heading" className="mt-3 text-xl font-bold sm:text-2xl">Catch up on the key plays</h2>

      <TimelineStatus loading={!data} />
      {data && !matches.length && <p className="mt-4 text-sm text-ctp-subtext1">Match recaps are on the way.</p>}
      <div className="mt-5 space-y-3">{matches.map((match, index) => <Link key={match.id} to={`/timelines/${match.id}`} aria-label={`Read ${match.players.map(player => player.name).join(" versus ")} recap`} className={`home-interactive block min-w-0 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue ${index === 0 ? "[&_[data-component=CardArtTile]]:!w-20" : ""}`}>
        <p className="text-xs text-ctp-subtext1">{match.event} · {roundLabel(match.round)}</p>
        {index === 0 ? <>
          <div ref={reveal} className="home-recap mt-5"><MatchIdentity match={match} champions={champions} /></div>
          {match.games[0] && <p className="mt-5 text-sm text-ctp-subtext1"><span className="font-semibold text-ctp-text">Game {match.games[0].gameNumber} · </span>{match.games[0].summary}</p>}
          <p className="mt-4 text-sm font-semibold text-ctp-blue">Read match recap →</p>
        </> : <>
          <p className="mt-2 break-words font-semibold">{match.players.map(player => player.name).join(" vs. ")}</p>
          <p className="mt-1 text-sm text-ctp-blue">Read recap →</p>
        </>}
      </Link>)}</div>
      <Link to="/timelines" className="mt-4 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore all match timelines →</Link>
    </div>
  </section>;
}
