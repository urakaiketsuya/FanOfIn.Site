import DisclosureChevron from "../../components/DisclosureChevron";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexDecklistEntry, type OmnidexPlayer, type OmnidexStanding } from "@gatcg/shared";
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
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import { formatCountry } from "../../lib/format";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useCardsByNames } from "./useCardsByNames";
import { findDeckChampionName } from "../../lib/ttsExport";

type EventTab = "standings" | "pairings" | "decklists" | "teams" | "judges" | "statistics";
const ALL_EVENT_TABS: EventTab[] = ["standings", "pairings", "decklists", "teams", "judges", "statistics"];

function EventTopDecks({ eventId, decklists, players }: { eventId: number; decklists: OmnidexDecklistEntry[]; players: OmnidexPlayer[] }) {
  const topDecks = useMemo(() => [...players]
    .sort((a, b) => (a.finalPlacement ?? Infinity) - (b.finalPlacement ?? Infinity))
    .map((player) => ({ player, deck: decklists.find((entry) => entry.player === player.id) }))
    .filter((entry): entry is { player: OmnidexPlayer; deck: OmnidexDecklistEntry } => Boolean(entry.deck))
    .slice(0, 3), [decklists, players]);
  const materialNames = useMemo(() => topDecks.flatMap(({ deck }) => deck.decklist.material.map((line) => line.card)), [topDecks]);
  const cardsByName = useCardsByNames(materialNames);

  if (topDecks.length === 0) return null;
  return <section className="mt-5" aria-labelledby="top-event-decks">
    <div className="flex items-baseline justify-between gap-3"><h2 id="top-event-decks" className="text-sm font-semibold text-ctp-text">Top decks</h2><Link to={`/events/${eventId}?tab=decklists&browse=all`} className="text-xs font-medium text-ctp-blue">Browse all {decklists.length}</Link></div>
    <div className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
      {topDecks.map(({ player, deck }) => {
        const championCardName = findDeckChampionName(deck.decklist.material, cardsByName);
        const championName = championCardName?.split(",")[0].trim() ?? null;
        const champion = championCardName ? cardsByName.get(championCardName) : undefined;
        return <Link key={player.id} to={`/events/${eventId}?tab=decklists&player=${player.id}`} className="group grid min-w-36 shrink-0 snap-start grid-cols-[4.5rem_1fr] overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle transition-colors hover:border-ctp-blue sm:min-w-0">
          <CardHoverPreview image={champion?.editions[0]?.image} alt={championName ?? player.username}>
            {champion?.editions[0] ? <CardImage image={champion.editions[0].image} alt={championName ?? ""} className="h-28 w-[4.5rem] object-cover object-top" /> : <div className="h-28 w-[4.5rem] bg-ctp-surface0" />}
          </CardHoverPreview>
          <div className="min-w-0 self-center p-3"><p className="text-lg font-bold text-ctp-blue">#{player.finalPlacement ?? "–"}</p><p className="truncate text-sm font-medium text-ctp-text group-hover:text-ctp-blue">{player.username}</p>{championName && <p className="mt-1 truncate text-xs text-ctp-subtext0">{championName}</p>}</div>
        </Link>;
      })}
    </div>
  </section>;
}

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

  // Grouped by Omnidex's own venue id, not host name – some venues rename over time, so name
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
  const [tab, setTab] = useTabParam("tab", ALL_EVENT_TABS, "decklists");

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

  // `hasSubmittedDecklist` is only present on newer Omnidex responses – undefined means "unknown",
  // not "no", so this stays null (hidden) unless at least one standing actually carries the field.
  const decklistSubmissionRate = useMemo(() => {
    const known = Array.from(standingsById.values()).filter((s) => s.hasSubmittedDecklist !== undefined);
    if (known.length === 0) return null;
    return { submitted: known.filter((s) => s.hasSubmittedDecklist).length, total: known.length };
  }, [standingsById]);

  if (loading) {
    return (
      <PageLayout data-component="EventDetail" width="standard">
        <InlineState className="mt-10">Loading event {eventId}…</InlineState>
      </PageLayout>
    );
  }

  if (error && !bundle) {
    return (
      <PageLayout data-component="EventDetail" width="standard">
        <EmptyState
          title="Event unavailable"
          description={error}
          action={<Link to="/tournaments" className="text-ctp-blue hover:underline">&larr; Back</Link>}
        />
      </PageLayout>
    );
  }

  if (!bundle) return null;
  const { event, players } = bundle;

  const rankedPlayers = [...players].sort(
    (a, b) => (a.finalPlacement ?? Infinity) - (b.finalPlacement ?? Infinity),
  );

  const primaryTabs: { key: EventTab; label: string }[] = [];
  if (!isApiErrorBody(bundle.decklists)) primaryTabs.push({ key: "decklists", label: `Decks (${bundle.decklists.length})` });
  primaryTabs.push({ key: "standings", label: `Results (${rankedPlayers.length})` });
  const secondaryTabs: { key: EventTab; label: string }[] = [];
  if (event.stages.length > 0) secondaryTabs.push({ key: "pairings", label: "Pairings" });
  if (!isApiErrorBody(bundle.teams) && bundle.teams.length > 0) secondaryTabs.push({ key: "teams", label: `Teams (${bundle.teams.length})` });
  if (!isApiErrorBody(bundle.judges) && bundle.judges.length > 0) secondaryTabs.push({ key: "judges", label: "Judges" });
  if (!isApiErrorBody(bundle.statistics)) secondaryTabs.push({ key: "statistics", label: "Statistics" });
  const availableTabs = [...primaryTabs, ...secondaryTabs];
  const activeTab = availableTabs.some((item) => item.key === tab) ? tab : primaryTabs[0].key;
  const secondaryActive = secondaryTabs.some((item) => item.key === activeTab);

  return (
    <PageLayout data-component="EventDetail" width="standard">
      <Link to="/tournaments" className="inline-flex min-h-control items-center rounded-md text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">
        &larr; Back to Tournaments
      </Link>

      <header className="identity-surface mt-2 rounded-xl p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-ctp-subtext1">
          <span className="rounded-full border border-ctp-surface2 px-3 py-1">{EVENT_CATEGORY_LABELS[event.category] ?? event.category}</span>
          <span className="rounded-full border border-ctp-surface2 px-3 py-1">{event.format}</span>
          <span className="rounded-full border border-ctp-surface2 px-3 py-1 capitalize">{event.status}</span>
        </div>
        <h1 className="mt-3 break-words text-3xl font-bold leading-tight text-ctp-text sm:text-4xl">{event.name}</h1>
        <div className="mt-3 text-sm text-ctp-subtext1">
          <time dateTime={event.date}>{new Date(event.date).toLocaleDateString()}</time>
          <p className="mt-1 break-words" title={event.host.address || undefined}>{event.host.name}</p>
          {formatCountry(event.host.addressCountryCode) && <Link
            to={`/regions?group=country&region=${event.host.addressCountryCode}`}
            className="inline-flex min-h-control items-center rounded-md text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue"
          >{formatCountry(event.host.addressCountryCode)}</Link>}
          {event.season && <p className="mt-1">{event.season.name}</p>}
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-ctp-surface1 pt-4">
          <div><dt className="text-xs text-ctp-subtext0">Players</dt><dd className="mt-1 text-3xl font-semibold tabular-nums text-ctp-text">{rankedPlayers.length}</dd></div>
          {!isApiErrorBody(bundle.decklists) && <div><dt className="text-xs text-ctp-subtext0">Available deck lists</dt><dd className="mt-1 text-3xl font-semibold tabular-nums text-ctp-text">{bundle.decklists.length}</dd></div>}
        </dl>
      </header>

      {!isApiErrorBody(bundle.decklists) && <EventTopDecks eventId={eventId} decklists={bundle.decklists} players={players} />}

      {!secondaryActive && primaryTabs.length > 1 && (
        <div className="mt-4">
          <Tabs tabs={primaryTabs} active={activeTab} onChange={setTab} label="Event results" />
        </div>
      )}

      {secondaryActive && <Button onClick={() => setTab(primaryTabs[0].key)} className="mt-5">← Back to event results</Button>}

      {(event.description || vods.length > 0 || venueEvents.length > 0 || secondaryTabs.length > 0) && <details className="group mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ctp-subtext1 [&::-webkit-details-marker]:hidden"><span>More event data</span><DisclosureChevron className="transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-ctp-surface1 pb-2 pt-3">
          {event.description && <p className="text-sm text-ctp-subtext0">{event.description}</p>}
          {vods.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{vods.map((vod, i) => <a key={i} href={vod.url} target="_blank" rel="noreferrer" className="inline-flex min-h-control items-center rounded-md border border-ctp-blue px-3 py-2 text-sm text-ctp-blue">▶ {vod.label}</a>)}</div>}
          {secondaryTabs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{secondaryTabs.map((item) => <Button key={item.key} onClick={() => setTab(item.key)} aria-pressed={activeTab === item.key} className={activeTab === item.key ? "border-ctp-blue text-ctp-blue" : ""}>{item.label}</Button>)}</div>}
          {venueEvents.length > 0 && <div className="mt-4"><p className="text-xs font-medium text-ctp-subtext1">More at {event.host.name}</p><div className="mt-2 flex flex-wrap gap-2 text-xs">{venueEvents.slice(0, MAX_VENUE_EVENTS_SHOWN).map((venueEvent) => <Link key={venueEvent.id} to={`/events/${venueEvent.id}`} className="inline-flex min-h-control items-center rounded-md border border-ctp-surface1 px-3 py-2 text-ctp-subtext1 hover:border-ctp-blue">{venueEvent.name} · {new Date(venueEvent.date).toLocaleDateString()}</Link>)}</div></div>}
        </div>
      </details>}

      {activeTab === "standings" && (
        <Section className="mt-6" heading="compact" title={`Standings (${rankedPlayers.length} players)`}>
          {decklistSubmissionRate && (
            <p className="mt-0.5 text-xs text-ctp-subtext0">
              {decklistSubmissionRate.submitted} of {decklistSubmissionRate.total} players submitted a decklist
              {decklistSubmissionRate.total > 0 && ` (${Math.round((decklistSubmissionRate.submitted / decklistSubmissionRate.total) * 100)}%)`}
            </p>
          )}
          <div className="mt-3 space-y-2 sm:hidden">
            {rankedPlayers.map((player) => { const standing = standingsById.get(player.id); return <div key={player.id} className="flex items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><span className="w-9 shrink-0 text-center text-lg font-bold text-ctp-blue">#{player.finalPlacement ?? "–"}</span><div className="min-w-0 flex-1"><PlayerLink id={player.id} username={player.username} className="flex min-h-control items-center break-words font-medium text-ctp-text" /><p className="mt-0.5 text-xs text-ctp-subtext0">{standing ? `${standing.statsWins}-${standing.statsLosses}-${standing.statsTies}` : "Record unavailable"}{standing ? ` · ${standing.statsPercentGW}% games` : ""}</p></div>{!isApiErrorBody(bundle.decklists) && bundle.decklists.some((entry) => entry.player === player.id) && <Link to={`?tab=decklists&player=${player.id}`} className="inline-flex min-h-control min-w-control shrink-0 items-center justify-center rounded-md px-2 text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Deck</Link>}</div>; })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="mt-2 w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                  <th className="py-1 pr-6">Place</th>
                  <th className="py-1 pr-6">Player</th>
                  <th className="py-1 pr-6">Record</th>
                  <th className="py-1 pr-6">GW%</th>
                  <th className="py-1 pr-6" title="Opponents' match win % – strength of schedule">
                    OMW%
                  </th>
                  <th className="py-1 pr-6">Byes</th>
                  <th className="py-1">Tiebreaker</th>
                  <th className="py-1 pl-4">Deck list</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                {rankedPlayers.map((player) => {
                  const s = standingsById.get(player.id);
                  return (
                    <tr key={player.id}>
                      <td className="py-1 pr-6 text-ctp-subtext1">{player.finalPlacement ?? "–"}</td>
                      <td className="py-1 pr-6 whitespace-nowrap text-ctp-text">
                        <PlayerLink id={player.id} username={player.username} className="inline-flex min-h-control items-center" />
                      </td>
                      <td className="py-1 pr-6 text-ctp-subtext1">
                        {s ? `${s.statsWins}-${s.statsLosses}-${s.statsTies}` : "–"}
                      </td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s ? `${s.statsPercentGW}%` : "–"}</td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s ? `${s.statsPercentOMW}%` : "–"}</td>
                      <td className="py-1 pr-6 text-ctp-subtext1">{s?.statsByes ?? "–"}</td>
                      <td className="py-1 text-ctp-subtext1">{s?.tiebreaker ?? "–"}</td>
                      <td className="py-1 pl-4">{!isApiErrorBody(bundle.decklists) && bundle.decklists.some((entry) => entry.player === player.id)
                        ? <Link to={`?tab=decklists&player=${player.id}`} className="inline-flex min-h-control items-center rounded-md px-2 text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">View deck</Link>
                        : <span className="text-xs text-ctp-subtext0">Unavailable</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
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
          <DecklistsSection format={event.format.toLowerCase() === "standard" ? "STANDARD" : event.format.toLowerCase() === "pantheon" ? "PANTHEON" : "UNKNOWN"} eventId={eventId} decklists={bundle.decklists} players={players} />
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
        <Section className="mt-6" heading="compact" title="Statistics">
          <div className="mt-2">
            <RawObject data={bundle.statistics} />
          </div>
        </Section>
      )}
    </PageLayout>
  );
}
