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

const MIN_PLAYERS_OPTIONS = [0, 8, 16, 32];
const PAGE_SIZE = 50;
type SortMode = "date" | "type";

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
  const [sortMode, setSortMode] = useState<SortMode>(() => searchParams.get("sort") === "type" ? "type" : "date");
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

  const events = useMemo(() => {
    if (!index) return [];
    const needle = search.trim().toLowerCase();
    const filtered = index.events.filter(
      (e) =>
        e.playerCount >= minPlayers &&
        (!category || e.category === category) &&
        (!setting || e.setting === setting) &&
        (seasonId === null || e.seasonId === seasonId) &&
        (!needle || e.name.toLowerCase().includes(needle) || e.hostName.toLowerCase().includes(needle)),
    );
    return filtered.sort((a, b) => {
      if (sortMode === "type") {
        const rankDiff = categoryRank(a.category) - categoryRank(b.category);
        if (rankDiff !== 0) return rankDiff;
      }
      return b.date.localeCompare(a.date);
    });
  }, [index, minPlayers, category, setting, seasonId, sortMode, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [minPlayers, category, setting, seasonId, sortMode, search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (category) next.set("category", category);
    if (setting) next.set("setting", setting);
    if (seasonId !== null) next.set("season", String(seasonId));
    if (minPlayers > 0) next.set("minPlayers", String(minPlayers));
    if (sortMode !== "date") next.set("sort", sortMode);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [category, minPlayers, search, searchParams, seasonId, setSearchParams, setting, sortMode]);

  const visibleEvents = events.slice(0, visibleCount);

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
          aria-label="Search by event or host name"
          placeholder="Search by event or host name…"
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
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ctp-text [&::-webkit-details-marker]:hidden"><span>Filter and sort{[category, setting, seasonId, minPlayers > 0 ? minPlayers : null].filter(Boolean).length ? ` · ${[category, setting, seasonId, minPlayers > 0 ? minPlayers : null].filter(Boolean).length} active` : ""}</span><span aria-hidden="true" className="text-ctp-subtext0 transition-transform group-open:rotate-180">⌄</span></summary>
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
        {(["date", "type"] as const).map((mode) => (
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
      <button type="button" onClick={() => { setSearch(""); setCategory(null); setSetting(null); setSeasonId(null); setMinPlayers(0); setSortMode("date"); }} className="mt-3 min-h-11 rounded-lg px-3 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Clear all filters</button>
      </details>

      {!index && <InlineState className="mt-6">Loading…</InlineState>}
      {index && events.length === 0 && (
        <InlineState className="mt-6">
          No ingested events match this filter yet. Not every event gets deep-fetched — if you know its ID, try
          the lookup box above.
        </InlineState>
      )}

      {index && events.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {events.length} event{events.length === 1 ? "" : "s"} match
        </p>
      )}

      <div className="mt-2 space-y-2">
        {visibleEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>

      <LoadMore remaining={events.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </PageLayout>
  );
}
