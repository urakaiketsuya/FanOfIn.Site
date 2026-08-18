import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS } from "@gatcg/shared";
import { isApiErrorBody } from "../../lib/api/client";
import { useEventBundle } from "./useEventBundle";
import { useVodsData } from "./data";
import EventPairings from "./EventPairings";
import DecklistsSection from "./DecklistsSection";
import EventTeamsSection from "./EventTeamsSection";
import JudgesSection from "./JudgesSection";
import RawObject from "./RawObject";
import PlayerLink from "../players/PlayerLink";

export default function EventDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { bundle, loading, error } = useEventBundle(eventId);
  const vodsData = useVodsData();
  const vods = vodsData?.vods[id] ?? [];

  const standingsById = useMemo(() => {
    if (!bundle || isApiErrorBody(bundle.standings)) return new Map();
    return new Map(bundle.standings.standings.map((s) => [s.id, s]));
  }, [bundle]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-ctp-subtext1">Loading event {eventId}…</p>
      </div>
    );
  }

  if (error && !bundle) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-ctp-red">{error}</p>
        <Link to="/tournaments" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; Back
        </Link>
      </div>
    );
  }

  if (!bundle) return null;
  const { event, players } = bundle;

  const rankedPlayers = [...players].sort(
    (a, b) => (a.finalPlacement ?? Infinity) - (b.finalPlacement ?? Infinity),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/tournaments" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Tournaments
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{event.name}</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        {event.host.name} · {new Date(event.date).toLocaleDateString()} · {event.format} · {event.status} ·{" "}
        {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
        {event.season && ` · ${event.season.name}`}
      </p>
      {event.description && <p className="mt-2 text-sm text-ctp-subtext0">{event.description}</p>}
      {vods.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {vods.map((vod, i) => (
            <a
              key={i}
              href={vod.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
            >
              &#9654; Watch {vod.label}
            </a>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
          Standings ({rankedPlayers.length} players)
        </h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1">Place</th>
              <th className="py-1">Player</th>
              <th className="py-1">Record</th>
              <th className="py-1">GW%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0">
            {rankedPlayers.map((player) => {
              const s = standingsById.get(player.id);
              return (
                <tr key={player.id}>
                  <td className="py-1 text-ctp-subtext1">{player.finalPlacement ?? "—"}</td>
                  <td className="py-1 text-ctp-text">
                    <PlayerLink id={player.id} username={player.username} />
                  </td>
                  <td className="py-1 text-ctp-subtext1">
                    {s ? `${s.statsWins}-${s.statsLosses}-${s.statsTies}` : "—"}
                  </td>
                  <td className="py-1 text-ctp-subtext1">{s ? `${s.statsPercentGW}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {event.swissRounds && (
        <div className="mt-6">
          <EventPairings eventId={eventId} players={players} swissRounds={event.swissRounds} />
        </div>
      )}

      {!isApiErrorBody(bundle.decklists) && (
        <div className="mt-6">
          <DecklistsSection eventId={eventId} decklists={bundle.decklists} players={players} />
        </div>
      )}

      {!isApiErrorBody(bundle.teams) && (
        <div className="mt-6">
          <EventTeamsSection teams={bundle.teams} players={players} />
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Statistics</h2>
          <div className="mt-2">
            <RawObject data={bundle.statistics} />
          </div>
        </div>
        {!isApiErrorBody(bundle.judges) && <JudgesSection judges={bundle.judges} />}
      </div>
    </div>
  );
}
