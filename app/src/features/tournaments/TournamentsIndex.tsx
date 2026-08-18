import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useOmnidexIndex } from "./data";
import EventRow from "./EventRow";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const MIN_PLAYERS_OPTIONS = [0, 8, 16, 32];
type SortMode = "date" | "type";

function categoryRank(category: string): number {
  const i = EVENT_CATEGORY_ORDER.indexOf(category);
  return i === -1 ? EVENT_CATEGORY_ORDER.length : i;
}

export default function TournamentsIndex() {
  useDocumentTitle("Tournaments", "Browse Grand Archive TCG tournament results from Store Championships to Worlds.");
  const index = useOmnidexIndex();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [idLookup, setIdLookup] = useState("");
  const [minPlayers, setMinPlayers] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");

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
  }, [index, minPlayers, category, seasonId, sortMode, search]);

  function handleIdLookup(e: FormEvent) {
    e.preventDefault();
    const trimmed = idLookup.trim();
    if (trimmed && /^\d+$/.test(trimmed)) navigate(`/events/${trimmed}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Tournaments</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Events ingested by the tournament data pipeline. Only a subset of Omnidex events are deep-fetched —
        most are small weekly leagues below the pipeline's size threshold.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search by event or host name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        <form onSubmit={handleIdLookup} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Or jump to event ID…"
            value={idLookup}
            onChange={(e) => setIdLookup(e.target.value)}
            className="w-40 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
          >
            Go
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Type:</span>
        <button
          onClick={() => setCategory(null)}
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
            className={`rounded-md border px-2 py-1 text-xs ${
              category === c ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {EVENT_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Season:</span>
        <select
          value={seasonId ?? ""}
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
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {!index && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {index && events.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">
          No ingested events match this filter yet. Not every event gets deep-fetched — if you know its ID, try
          the lookup box above.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
