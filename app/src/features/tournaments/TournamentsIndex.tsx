import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useOmnidexIndex } from "./data";
import EventRow from "./EventRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import { filterAndSortEvents, groupEventsByMonth, type EventCoverageFilter, type EventDecklistFilter, type EventSortMode } from "./eventBrowser";

const MIN_PLAYERS_OPTIONS = [0, 8, 16, 32];
const PAGE_SIZE = 50;
type ViewMode = "list" | "calendar";

function categoryRank(category: string): number {
  const i = EVENT_CATEGORY_ORDER.indexOf(category);
  return i === -1 ? EVENT_CATEGORY_ORDER.length : i;
}

export default function TournamentsIndex() {
  useDocumentTitle("Tournaments", "Browse Grand Archive TCG tournament results from Store Championships to Worlds.");
  const index = useOmnidexIndex();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [idLookup, setIdLookup] = useState("");
  const [minPlayers, setMinPlayers] = useState(() => Number(searchParams.get("minPlayers")) || 0);
  const [category, setCategory] = useState<string | null>(() => searchParams.get("category"));
  const [setting, setSetting] = useState<string | null>(() => searchParams.get("setting"));
  const [seasonId, setSeasonId] = useState<number | null>(() => { const value = Number(searchParams.get("season")); return Number.isInteger(value) && value > 0 ? value : null; });
  const [country, setCountry] = useState<string | null>(() => searchParams.get("country"));
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [decklists, setDecklists] = useState<EventDecklistFilter>(() => searchParams.get("decklists") === "available" ? "available" : searchParams.get("decklists") === "unavailable" ? "unavailable" : "any");
  const [coverage, setCoverage] = useState<EventCoverageFilter>(() => {
    const value = searchParams.get("coverage");
    return value === "some" || value === "complete" || value === "none" ? value : "any";
  });
  const [sortMode, setSortMode] = useState<EventSortMode>(() => searchParams.get("sort") === "type" ? "type" : searchParams.get("sort") === "size" ? "size" : searchParams.get("sort") === "relevance" ? "relevance" : "date");
  const [viewMode, setViewMode] = useState<ViewMode>(() => searchParams.get("view") === "calendar" ? "calendar" : "list");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categoriesPresent = useMemo(() => {
    if (!index) return [];
    const present = new Set(index.events.map((e) => e.category));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [index]);

  const seasonsPresent = useMemo(() => {
    if (!index) return [];
    return [...index.seasons].sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  }, [index]);

  const countriesPresent = useMemo(() => {
    if (!index) return [];
    return [...new Set(index.events.map((event) => event.hostCountry).filter((value) => value && value !== "??"))].sort();
  }, [index]);

  const events = useMemo(() => {
    if (!index) return [];
    return filterAndSortEvents(index.events, { search, minPlayers, category, setting, seasonId, country, dateFrom, dateTo, decklists, coverage, sort: sortMode }, categoryRank);
  }, [index, search, minPlayers, category, setting, seasonId, country, dateFrom, dateTo, decklists, coverage, sortMode]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [minPlayers, category, setting, seasonId, country, dateFrom, dateTo, decklists, coverage, sortMode, search, viewMode]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (category) next.set("category", category);
    if (setting) next.set("setting", setting);
    if (seasonId !== null) next.set("season", String(seasonId));
    if (country) next.set("country", country);
    if (dateFrom) next.set("from", dateFrom);
    if (dateTo) next.set("to", dateTo);
    if (decklists !== "any") next.set("decklists", decklists);
    if (coverage !== "any") next.set("coverage", coverage);
    if (minPlayers > 0) next.set("minPlayers", String(minPlayers));
    if (sortMode !== "date") next.set("sort", sortMode);
    if (viewMode !== "list") next.set("view", viewMode);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [category, country, coverage, dateFrom, dateTo, decklists, minPlayers, search, searchParams, seasonId, setSearchParams, setting, sortMode, viewMode]);

  const visibleEvents = events.slice(0, visibleCount);
  const calendarGroups = useMemo(() => groupEventsByMonth(visibleEvents), [visibleEvents]);

  function handleIdLookup(e: FormEvent) {
    e.preventDefault();
    const trimmed = idLookup.trim();
    if (trimmed && /^\d+$/.test(trimmed)) navigate(`/events/${trimmed}`);
  }

  return (
    <PageLayout data-component="TournamentsIndex">
      <PageHeader
        title="Browse Events"
        description="Find an event directly across every season. Search and filters stay in the URL so this view can be shared."
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          aria-label="Search by event, player, champion, organizer, or location"
          placeholder="Search event, player, Champion, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-base text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:text-sm"
        />
        <form onSubmit={handleIdLookup} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Jump to event ID"
            placeholder="Or jump to event ID…"
            value={idLookup}
            onChange={(e) => setIdLookup(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-base text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:w-44 sm:text-sm"
          />
          <Button type="submit" variant="secondary">Go</Button>
        </form>
      </div>

      <details className="group mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ctp-text [&::-webkit-details-marker]:hidden"><span>Filter and sort{[category, setting, seasonId, country, dateFrom, dateTo, decklists !== "any" ? decklists : null, minPlayers > 0 ? minPlayers : null].filter(Boolean).length ? ` · ${[category, setting, seasonId, country, dateFrom, dateTo, decklists !== "any" ? decklists : null, minPlayers > 0 ? minPlayers : null].filter(Boolean).length} active` : ""}</span><span aria-hidden="true" className="text-ctp-subtext0 transition-transform group-open:rotate-180">⌄</span></summary>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Type:</span>
        <button
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`rounded-md border px-2 py-1 text-xs ${
            category === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          All
        </button>
        {categoriesPresent.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-md border px-2 py-1 text-xs ${
              category === c ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {EVENT_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Setting:</span>
        {[null, "physical", "online"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setSetting(s)}
            aria-pressed={setting === s}
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              setting === s ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Season:</span>
        <select
          value={seasonId ?? ""}
          aria-label="Season"
          onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All seasons</option>
          {seasonsPresent.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-ctp-subtext1">Country
          <select value={country ?? ""} onChange={(event) => setCountry(event.target.value || null)} className="mt-1 min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text">
            <option value="">All countries</option>
            {countriesPresent.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs text-ctp-subtext1">From
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" />
        </label>
        <label className="text-xs text-ctp-subtext1">Through
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Deck lists:</span>
        {(["any", "available", "unavailable"] as const).map((value) => <button key={value} type="button" onClick={() => setDecklists(value)} aria-pressed={decklists === value} className={`min-h-9 rounded-lg border px-3 text-xs capitalize ${decklists === value ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{value}</button>)}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Public deck coverage:</span>
        {(["any", "some", "complete", "none"] as const).map((value) => <button key={value} type="button" onClick={() => setCoverage(value)} aria-pressed={coverage === value} className={`min-h-9 rounded-lg border px-3 text-xs capitalize ${coverage === value ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{value}</button>)}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Min players:</span>
        {MIN_PLAYERS_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setMinPlayers(n)}
            aria-pressed={minPlayers === n}
            className={`rounded-md border px-2 py-1 text-xs ${
              minPlayers === n ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {n === 0 ? "Any" : `${n}+`}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(["date", "size", "type", "relevance"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            aria-pressed={sortMode === mode}
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { setSearch(""); setCategory(null); setSetting(null); setSeasonId(null); setCountry(null); setDateFrom(""); setDateTo(""); setDecklists("any"); setCoverage("any"); setMinPlayers(0); setSortMode("date"); }} className="mt-3 min-h-11 rounded-lg px-3 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Clear all filters</button>
      </details>

      {!index && <InlineState className="mt-6">Loading…</InlineState>}
      {index && events.length === 0 && (
        <InlineState className="mt-6">
          No ingested events match this filter yet. Not every event gets deep-fetched — if you know its ID, try
          the lookup box above.
        </InlineState>
      )}

      {index && events.length > 0 && <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-ctp-subtext0">{events.length} event{events.length === 1 ? "" : "s"} match</p><div role="group" aria-label="Event results view" className="flex rounded-lg bg-ctp-mantle p-1">{(["list", "calendar"] as const).map((mode) => <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)} className={`min-h-9 rounded-md px-3 text-xs capitalize ${viewMode === mode ? "bg-ctp-blue/15 font-semibold text-ctp-blue" : "text-ctp-subtext1"}`}>{mode}</button>)}</div></div>}

      {viewMode === "list" ? <div className="mt-2 space-y-2">{visibleEvents.map((event) => <EventRow key={event.id} event={event} />)}</div> : <div className="mt-4 space-y-6">{calendarGroups.map((group) => <section key={group.key}><h2 className="sticky top-0 z-10 border-b border-ctp-surface1 bg-ctp-base/95 py-2 text-sm font-semibold text-ctp-text backdrop-blur">{group.label} <span className="font-normal text-ctp-subtext0">· {group.events.length}</span></h2><div className="mt-2 space-y-2">{group.events.map((event) => <EventRow key={event.id} event={event} />)}</div></section>)}</div>}

      <LoadMore remaining={events.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </PageLayout>
  );
}
