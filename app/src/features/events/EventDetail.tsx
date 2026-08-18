import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexStanding } from "@gatcg/shared";
import { isApiErrorBody } from "../../lib/api/client";
import { useEventBundle } from "./useEventBundle";
import { useVodsData } from "./data";
import EventPairings from "./EventPairings";
import DecklistsSection from "./DecklistsSection";
import EventTeamsSection from "./EventTeamsSection";
import JudgesSection from "./JudgesSection";
import RawObject from "./RawObject";
import PlayerLink from "../players/PlayerLink";

type EventTab = "standings" | "pairings" | "decklists" | "teams" | "judges" | "statistics";

export default function EventDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { bundle, loading, error } = useEventBundle(eventId);
  const vodsData = useVodsData();
  const vods = vodsData?.vods[id] ?? [];
  const [tab, setTab] = useState<EventTab>("standings");

  // Individual-format events key each standing by numeric player `id`. Team-format events (e.g.
  // 3v3) instead key by team `name` and have no per-player record at all -- verified live against
  // a real Ascent event, where every standing had `name` but no `id`. For those, join each team's
  // standing back to its roster via the Teams response so every player on the team shows the
  // team's shared record instead of a blank one.
  const standingsById = useMemo(() => {
    const byId = new Map<number, OmnidexStanding>();
    if (!bundle || isApiErrorBody(bundle.standings)) return byId;

    for (const s of bundle.standings.standings) {
      if (s.id !== undefined) byId.set(s.id, s);
    }
    if (byId.size > 0 || isApiErrorBody(bundle.teams)) return byId;

    const standingByTeamName = new Map<string, OmnidexStanding>();
    for (const s of bundle.standings.standings) {
      if (s.name !== undefined) standingByTeamName.set(s.name, s);
    }
    for (const team of bundle.teams) {
      const standing = standingByTeamName.get(team.name);
      if (!standing) continue;
      for (const p of team.players) byId.set(p.id, standing);
    }
    return byId;
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

  const tabs: { key: EventTab; label: string }[] = [{ key: "standings", label: "Standings" }];
  if (event.swissRounds) tabs.push({ key: "pairings", label: "Pairings" });
  if (!isApiErrorBody(bundle.decklists)) tabs.push({ key: "decklists", label: "Decklists" });
  if (!isApiErrorBody(bundle.teams) && bundle.teams.length > 0) tabs.push({ key: "teams", label: `Teams (${bundle.teams.length})` });
  if (!isApiErrorBody(bundle.judges) && bundle.judges.length > 0) tabs.push({ key: "judges", label: "Judges" });
  if (!isApiErrorBody(bundle.statistics)) tabs.push({ key: "statistics", label: "Statistics" });
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "standings";

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

      {tabs.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 border-b border-ctp-surface1 pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                activeTab === t.key ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "standings" && (
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
      )}

      {activeTab === "pairings" && event.swissRounds && (
        <div className="mt-6">
          <EventPairings eventId={eventId} players={players} swissRounds={event.swissRounds} />
        </div>
      )}

      {activeTab === "decklists" && !isApiErrorBody(bundle.decklists) && (
        <div className="mt-6">
          <DecklistsSection eventId={eventId} decklists={bundle.decklists} players={players} />
        </div>
      )}

      {activeTab === "teams" && !isApiErrorBody(bundle.teams) && (
        <div className="mt-6">
          <EventTeamsSection teams={bundle.teams} players={players} />
        </div>
      )}

      {activeTab === "judges" && !isApiErrorBody(bundle.judges) && (
        <div className="mt-6">
          <JudgesSection judges={bundle.judges} />
        </div>
      )}

      {activeTab === "statistics" && !isApiErrorBody(bundle.statistics) && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Statistics</h2>
          <div className="mt-2">
            <RawObject data={bundle.statistics} />
          </div>
        </div>
      )}
    </div>
  );
}
