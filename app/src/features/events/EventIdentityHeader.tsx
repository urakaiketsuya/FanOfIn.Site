import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexEvent, type OmnidexPlayer, type OmnidexDecklistEntry, type OmnidexTeam } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import { formatCountry } from "../../lib/format";
import { useCardsByNames } from "./useCardsByNames";

export default function EventIdentityHeader({ event, players, decklists, teams, storeLink }: {
  event: OmnidexEvent; players: OmnidexPlayer[]; decklists?: OmnidexDecklistEntry[]; teams?: OmnidexTeam[]; storeLink: boolean;
}) {
  const complete = event.status === "complete";
  const winners = complete ? players.filter(player => player.finalPlacement === 1) : [];
  const team = complete ? teams?.find(item => item.finalPlacement === 1) : undefined;
  const winner = !team && winners.length === 1 ? winners[0] : undefined;
  const deck = winner ? decklists?.find(item => item.player === winner.id) : undefined;
  const names = deck?.decklist.material.map(line => line.card) ?? [];
  const cards = useCardsByNames(names);
  const champion = [...cards.values()].filter(card => card.types.includes("CHAMPION")).sort((a, b) => (b.level ?? -1) - (a.level ?? -1))[0];
  const date = new Date(event.startAt || event.date);
  const validDate = Number.isFinite(date.getTime());
  const upcoming = !complete && !event.startedAt && !event.dateStarted;
  const status = complete ? "Completed" : event.startedAt || event.dateStarted ? "In progress" : event.status.replaceAll("-", " ");
  return <header data-component="EventIdentityHeader" className="identity-surface mt-2 overflow-hidden rounded-2xl border border-ctp-surface1 border-t-4 border-t-ctp-blue p-4 sm:p-6">
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.65fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="uppercase tracking-widest text-ctp-blue">{EVENT_CATEGORY_LABELS[event.category] ?? event.category}</span><span className="rounded-full border border-ctp-surface2 px-3 py-1 capitalize text-ctp-subtext1">{status}</span></div>
        <h1 className="mt-3 break-words text-3xl font-bold leading-tight text-ctp-text sm:text-4xl">{event.name}</h1>
        <p className="mt-3 text-sm font-medium text-ctp-text">{validDate ? <time dateTime={event.startAt || event.date}>{date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</time> : "Date to be announced"}<span className="capitalize"> · {event.format}</span></p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ctp-subtext1">
          {storeLink ? <Link to={`/stores/${event.host.id}`} className="inline-flex min-h-12 items-center break-words text-ctp-blue underline">{event.host.name}</Link> : <span>{event.host.name}</span>}
          {event.setting === "online" ? <span>Online</span> : formatCountry(event.host.addressCountryCode) && <Link className="inline-flex min-h-12 items-center text-ctp-blue underline" to={`/regions?group=country&region=${event.host.addressCountryCode}`}>{formatCountry(event.host.addressCountryCode)}</Link>}
        </div>
        {event.season && <p className="mt-1 text-xs text-ctp-subtext0">{event.season.name}</p>}
      </div>
      <div className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-base/60 p-4">
        {winner || team ? <>
          <p className="text-xs font-semibold uppercase tracking-widest text-ctp-yellow">{team ? "Winning team" : "Tournament winner"}</p>
          <div className="mt-3 flex items-center gap-4">
            {champion && <div className="w-20 shrink-0"><CardArtTile card={champion} name={champion.name} /></div>}
            <div className="min-w-0">{winner ? <Link className="flex min-h-12 items-center break-words text-xl font-bold text-ctp-text underline decoration-ctp-yellow/50" to={`/players/${winner.id}`}>{winner.username}</Link> : <p className="break-words text-xl font-bold">{team?.name}</p>}
              {champion && <Link to={`/cards/${champion.slug}`} className="flex min-h-12 items-center break-words text-sm text-ctp-blue">{champion.name}</Link>}
              {deck && winner && <Link to={`/events/${event.id}?tab=decklists&player=${winner.id}`} className="inline-flex min-h-12 items-center text-sm font-semibold text-ctp-blue underline">View winning deck →</Link>}
            </div>
          </div>
        </> : <>
          <p className="text-xs font-semibold uppercase tracking-widest text-ctp-blue">{complete ? "Final results" : upcoming ? "Event venue" : "Tournament underway"}</p>
          <p className="mt-3 whitespace-pre-line break-words text-sm text-ctp-subtext1">{complete ? "Winner not available" : event.setting === "online" ? "Online event" : event.host.address || event.host.name}</p>
          {!complete && event.url?.startsWith("https://") && <a href={event.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-12 items-center text-sm font-semibold text-ctp-blue underline">{upcoming ? "Event & registration" : "Follow on Omnidex"} ↗</a>}
        </>}
      </div>
    </div>
    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-ctp-surface1 pt-4">
      <div><dt className="text-xs text-ctp-subtext0">{upcoming ? "Registered players" : "Players"}</dt><dd className="text-2xl font-semibold tabular-nums">{players.length}</dd></div>
      {event.swissRounds != null && <div><dt className="text-xs text-ctp-subtext0">Swiss rounds</dt><dd className="text-2xl font-semibold tabular-nums">{event.swissRounds}</dd></div>}
      {event.singleEliminationCutSize != null && event.singleEliminationCutSize > 0 && <div><dt className="text-xs text-ctp-subtext0">Top cut</dt><dd className="text-2xl font-semibold tabular-nums">{event.singleEliminationCutSize}</dd></div>}
      {decklists && <div><dt className="text-xs text-ctp-subtext0">Published decks</dt><dd className="text-2xl font-semibold tabular-nums">{decklists.length}</dd></div>}
    </dl>
  </header>;
}
