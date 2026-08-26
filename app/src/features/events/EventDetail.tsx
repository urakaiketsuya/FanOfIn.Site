import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexStanding } from "@gatcg/shared";
import { isApiErrorBody } from "../../lib/api/client";
import { useEventBundle } from "./useEventBundle";
import { useVodsData } from "./data";
import { useOmnidexIndex } from "../tournaments/data";
import EventPairings from "./EventPairings";
import DecklistsSection from "./DecklistsSection";
import EventTeamsSection from "./EventTeamsSection";
import JudgesSection from "./JudgesSection";
import RawObject from "./RawObject";
import PlayerLink from "../players/PlayerLink";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";
import { formatCountry } from "../../lib/format";

type EventTab = "standings" | "pairings" | "decklists" | "teams" | "judges" | "statistics";
const ALL_EVENT_TABS: EventTab[] = ["standings", "pairings", "decklists", "teams", "judges", "statistics"];

export default function EventDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { bundle, loading, error } = useEventBundle(eventId);
  useDocumentTitle(
    bundle?.event.name,
    bundle &&
      `${bundle.event.host.name} · ${new Date(bundle.event.date).toLocaleDateString()} · ${
        EVENT_CATEGORY_LABELS[bundle.event.category] ?? bundle.event.category
      }${bundle.event.season ? ` · ${bundle.event.season.name}` : ""} Grand Archive TCG tournament results.`,
  );
  const vodsData = useVodsData();
  const vods = vodsData?.vods[id] ?? [];
  const omnidexIndex = useOmnidexIndex();

  // Grouped by Omnidex's own venue id, not host name — some venues rename over time, so name
  // matching would both miss real matches and wrongly merge unrelated venues that happen to share
  // a generic name.
  const MAX_VENUE_EVENTS_SHOWN = 6;
  const venueEvents = useMemo(() => {
    const hostId = bundle?.event.host?.id;
    if (!omnidexIndex || !hostId) return [];
    return omnidexIndex.events
      .filter((e) => e.hostId === hostId && e.id !== eventId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [omnidexIndex, bundle?.event.host?.id, eventId]);
  // A "?player=" link (e.g. from an achievement's "View deck") jumps straight to that player's
  // decklist instead of landing on Standings — read once on mount, same as the tab default.
  const [searchParams] = useSearchParams();
  const initialPlayerParam = searchParams.get("player");
  const initialPlayer = initialPlayerParam ? Number(initialPlayerParam) : undefined;
  const [tab, setTab] = useTabParam("tab", ALL_EVENT_TABS, initialPlayer !== undefined ? "decklists" : "standings");

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

  // `hasSubmittedDecklist` is only present on newer Omnidex responses — undefined means "unknown",
  // not "no", so this stays null (hidden) unless at least one standing actually carries the field.
  const decklistSubmissionRate = useMemo(() => {
    const known = Array.from(standingsById.values()).filter((s) => s.hasSubmittedDecklist !== undefined);
    if (known.length === 0) return null;
    return { submitted: known.filter((s) => s.hasSubmittedDecklist).length, total: known.length };
  }, [standingsById]);

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
  if (event.stages.length > 0) tabs.push({ key: "pairings", label: "Pairings" });
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
        <span title={event.host.address || undefined}>{event.host.name}</span>
        {formatCountry(event.host.addressCountryCode) && (
          <>
            {" ("}
            <Link
              to={`/regions?group=country&region=${event.host.addressCountryCode}`}
              className="hover:text-ctp-blue hover:underline"
            >
              {formatCountry(event.host.addressCountryCode)}
            </Link>
            {")"}
          </>
        )}{" "}
        · {new Date(event.date).toLocaleDateString()} · {event.format} · {event.status} ·{" "}
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

      {venueEvents.length > 0 && (
        <div className="mt-3">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
            More events at {event.host.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {venueEvents.slice(0, MAX_VENUE_EVENTS_SHOWN).map((e) => (
              <Link
                key={e.id}
                to={`/events/${e.id}`}
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
              >
                {e.name} <span className="text-ctp-subtext0">({new Date(e.date).toLocaleDateString()})</span>
              </Link>
            ))}
            {venueEvents.length > MAX_VENUE_EVENTS_SHOWN && (
              <span className="px-2 py-1 text-ctp-subtext0">+{venueEvents.length - MAX_VENUE_EVENTS_SHOWN} more</span>
            )}
          </div>
        </div>
      )}

      {tabs.length > 1 && (
        <div className="mt-4">
          <Tabs tabs={tabs} active={activeTab} onChange={setTab} label="Event data" />
        </div>
      )}

      {activeTab === "standings" && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Standings ({rankedPlayers.length} players)
          </h2>
          {decklistSubmissionRate && (
            <p className="mt-0.5 text-xs text-ctp-subtext0">
              {decklistSubmissionRate.submitted} of {decklistSubmissionRate.total} players submitted a decklist
              {decklistSubmissionRate.total > 0 && ` (${Math.round((decklistSubmissionRate.submitted / decklistSubmissionRate.total) * 100)}%)`}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="mt-2 w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                  <th className="py-1 pr-6">Place</th>
                  <th className="py-1 pr-6">Player</th>
                  <th className="py-1 pr-6">Record</th>
                  <th className="py-1 pr-6">GW%</th>
                  <th className="py-1 pr-6" title="Opponents' match win % — strength of schedule">
                    OMW%
                  </th>
                  <th className="py-1 pr-6">Byes</th>
                  <th className="py-1">Tiebreaker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                {rankedPlayers.map((player) => {
                  const s = standingsById.get(player.id);
                  return (
                    <tr key={player.id}>
                      <td className="py-1 pr-6 text-ctp-subtext1">{player.finalPlacement ?? "—"}</td>
                      <td className="py-1 pr-6 whitespace-nowrap text-ctp-text">
                        <PlayerLink id={player.id} username={player.username} />
                      </td>
                      <td className="py-1 pr-6 text-ctp-subtext1">
                        {s ? `${s.statsWins}-${s.statsLosses}-${s.statsTies}` : "—"}
                      </td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s ? `${s.statsPercentGW}%` : "—"}</td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s ? `${s.statsPercentOMW}%` : "—"}</td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s?.statsByes ?? "—"}</td>
                      <td className="py-1 text-ctp-subtext1">{s?.tiebreaker ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "pairings" && event.stages.length > 0 && (
        <div className="mt-6">
          <EventPairings
            eventId={eventId}
            players={players}
            stages={event.stages}
            swissRounds={event.swissRounds}
            singleEliminationCutSize={event.singleEliminationCutSize}
            decklists={isApiErrorBody(bundle.decklists) ? undefined : bundle.decklists}
          />
        </div>
      )}

      {activeTab === "decklists" && !isApiErrorBody(bundle.decklists) && (
        <div className="mt-6">
          <DecklistsSection eventId={eventId} decklists={bundle.decklists} players={players} initialPlayer={initialPlayer} />
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
