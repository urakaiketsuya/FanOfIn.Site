import type { BroadcastEventMaps } from "@gatcg/shared";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import EventTournament from "./EventTournament";
import { useEffect, useRef, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import GroupedResults from "./GroupedResults";
import { groupTimelineResults } from "./timelineResultGroups";
import Button from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/ContentState";
import { useBroadcastTimelines } from "./data";
import { championsForDeck, useTimelineChampions } from "./champions";
import TimelineStatus from "./TimelineStatus";

export default function TimelinesIndex() {
  useDocumentTitle("Match Timelines", "Players, cards and key moments from broadcast matches.");
  const data = useBroadcastTimelines();
  const champions = useTimelineChampions(true);
  const eventMaps = usePublishedData<BroadcastEventMaps>("broadcast-events", "/data/broadcast-events.json");
  const eventStatus = usePublishedDataStatus("broadcast-events", "/data/broadcast-events.json");
  const [params, setParams] = useSearchParams();
  const pendingParams = useRef(params);
  const [recalculating, startTransition] = useTransition();
  useEffect(() => { pendingParams.current = params; }, [params]);
  const search = params.get("q") ?? "";
  const event = params.get("event") ?? "";
  const champion = params.get("champion") ?? "";
  const view = params.get("view") === "timeline" ? "timeline" : "results";
  function updateValues(values: Record<string, string>) {
    const next = new URLSearchParams(pendingParams.current);
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    pendingParams.current = next;
    startTransition(() => setParams(next, { replace: true }));
  }
  function update(key: string, value: string) {
    updateValues({ [key]: value, stage: "", round: "", branch: "", page: "" });
  }
  const matches = data?.matches ?? [];
  const events = eventMaps?.events ?? [];
  const championNames = [...new Set(matches.flatMap(match => match.players.flatMap(player => championsForDeck(player.deck, champions).map(card => card.name.split(",")[0]))))].sort();
  const filtered = matches.filter(match => (!champion || match.players.some(player => championsForDeck(player.deck, champions).some(card => card.name.split(",")[0] === champion))) && [match.event, match.round, ...match.players.flatMap(player => [player.name, player.deck]), ...match.games.flatMap(game => game.beats.flatMap(beat => beat.cards ?? []))].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const matchingRecaps = new Set(filtered.map(m => m.id));
  const query = search.trim().toLowerCase();
  const matchingEvents = events.filter(e => (!query && !champion) || e.recapIds.some(id => matchingRecaps.has(id)) || (!champion && e.stages.some(stage => stage.matches.some(m => m.players.some(p => p.name.toLowerCase().includes(query))))));
  const selectedEvent = events.find(e => String(e.id) === event || e.aliases.includes(event)) ?? matchingEvents[0];
  const eventOptions = (query || champion) ? events.filter(e => matchingEvents.includes(e) || (event && e.id === selectedEvent?.id)) : events;
  const extraRecaps = selectedEvent ? filtered.filter(m => selectedEvent.unlinkedRecapIds.includes(m.id)) : [];
  const groups = groupTimelineResults(filtered, events, event);
  const allGroups = groupTimelineResults(matches, events);
  const resultCount = groups.reduce((count, group) => count + group.matches.length, 0);
  const clearFilters = () => updateValues({ q: "", champion: "", event: "", stage: "", round: "", branch: "", page: "" });
  const control = "min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue";
  return <PageLayout width="fluid" data-component="TimelinesIndex">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs text-ctp-subtext0">Broadcast recaps</p><h1 className="text-3xl font-bold">Match Timelines</h1></div>
      <Link to="/timelines/combos" className="inline-flex min-h-control items-center text-sm text-ctp-blue">Notable combos →</Link>
    </div>
    <div className="mt-5"><Tabs baseId="match-browse" label="Match browsing" tabs={[{ key: "results", label: "Results" }, { key: "timeline", label: "Timeline" }]} active={view} onChange={value => updateValues({ view: value === "results" ? "" : value })} /></div>
    <TimelineStatus loading={!data} />
    {recalculating && <p role="status" className="text-xs text-ctp-subtext1">Recalculating…</p>}
    <div className="my-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <label className="text-xs text-ctp-subtext1">Search<input className={`${control} mt-1`} value={search} onChange={e => update("q", e.target.value)} placeholder="Player or card" /></label>
      <label className="text-xs text-ctp-subtext1">Event<select className={`${control} mt-1`} value={event ? (view === "timeline" ? String(selectedEvent?.id ?? event) : (allGroups.find(group => group.key === event || group.name === event || group.event?.aliases.includes(event))?.key ?? event)) : ""} onChange={e => update("event", e.target.value)}><option value="">{view === "results" ? "All events" : "Latest matching event"}</option>{(view === "results" ? allGroups.map(group => ({ id: group.key, name: group.name })) : eventOptions).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs text-ctp-subtext1">Champion<select className={`${control} mt-1`} value={champion} onChange={e => update("champion", e.target.value)}><option value="">All champions</option>{championNames.map(name => <option key={name}>{name}</option>)}</select></label>
    </div>
    <TabPanel baseId="match-browse" tab="results" active={view}>
      {data && <><p className="mb-4 text-sm text-ctp-subtext1" aria-live="polite">{resultCount} {resultCount === 1 ? "match" : "matches"} · {groups.length} {groups.length === 1 ? "event" : "events"}</p>{groups.length ? <GroupedResults groups={groups} champions={champions} /> : <EmptyState title="No matches found" action={<Button onClick={clearFilters}>Clear filters</Button>} />}</>}
    </TabPanel>
    <TabPanel baseId="match-browse" tab="timeline" active={view}>
    {eventStatus.error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ctp-red"><span>Couldn’t refresh tournament results.</span><Button onClick={eventStatus.retry}>Retry</Button></div>}
    {!eventMaps && !eventStatus.error && <p role="status" className="text-sm text-ctp-subtext1">Loading tournament results…</p>}
    {eventMaps && data && <>
      {(search || champion) && <p className="mb-4 text-sm text-ctp-subtext1" aria-live="polite">{matchingEvents.length} matching {matchingEvents.length === 1 ? "event" : "events"}</p>}
      {!selectedEvent && <EmptyState title="No matches found" action={<Button onClick={clearFilters}>Clear filters</Button>} />}
      {selectedEvent && <EventTournament key={selectedEvent.id} event={selectedEvent} recaps={matches} champions={champions} params={params} update={updateValues} matchingRecaps={matchingRecaps} search={search} />}
      {!!extraRecaps.length && <div className="mt-6"><GroupedResults groups={groupTimelineResults(extraRecaps, events)} champions={champions} /></div>}
    </>}
    </TabPanel>
  </PageLayout>;
}
