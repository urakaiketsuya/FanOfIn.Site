import { useEffect, useMemo, useState } from "react";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import LoadMore from "../../components/LoadMore";
import { InlineState } from "../../components/ui/ContentState";
import { useArchetypeData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import { useDeckSightingsData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import DeckResultsSkeleton from "./DeckResultsSkeleton";

const SIGHTINGS_PAGE_SIZE = 50;

type SightingSortMode = "best" | "date" | "placement" | "duplicated" | "cheapest";
type Outcome = "all" | "winner" | "topCut" | "high";

const OUTCOME_LABELS: Record<Outcome, string> = {
  all: "All",
  winner: "Winners",
  topCut: "Top Cut",
  high: "High performers",
};

/** A deck with no known price is excluded whenever a max-price filter is active — can't call something "budget" without knowing what it costs. */
const MAX_PRICE_OPTIONS = [25, 50, 100, 250];

export default function DeckSightingsView({
  championName,
  setChampionName,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
}) {
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const archetypeData = useArchetypeData();

  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [sortMode, setSortMode] = useState<SightingSortMode>("date");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(SIGHTINGS_PAGE_SIZE);

  const usernameById = useMemo(
    () => new Map(playersData?.players.map((player) => [player.id, player.username]) ?? []),
    [playersData],
  );

  const classesByChampion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of [...(archetypeData?.archetypes ?? []), ...(archetypeData?.namedSpirits ?? [])]) {
      map.set(a.signature, a.classes);
    }
    return map;
  }, [archetypeData]);

  function toggleClass(cls: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  const categoriesPresent = useMemo(() => {
    if (!sightingsData) return [];
    const present = new Set(sightingsData.sightings.map((s) => s.eventCategory));
    return EVENT_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [sightingsData]);

  const seasonsPresent = useMemo(() => {
    if (!sightingsData) return [];
    const bySeasonId = new Map<number, string>();
    for (const s of sightingsData.sightings) {
      if (s.seasonId !== null && s.seasonName) bySeasonId.set(s.seasonId, s.seasonName);
    }
    return Array.from(bySeasonId.entries()).sort((a, b) => b[0] - a[0]);
  }, [sightingsData]);

  const championsPresent = useMemo(() => {
    if (!sightingsData) return [];
    return Array.from(new Set(sightingsData.sightings.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [sightingsData]);

  const classesPresent = useMemo(() => {
    const present = new Set<string>();
    for (const name of championsPresent) {
      for (const cls of classesByChampion.get(name) ?? []) present.add(cls);
    }
    return Array.from(present).sort();
  }, [championsPresent, classesByChampion]);

  const keywordsPresent = useMemo(() => {
    if (!sightingsData) return [];
    const present = new Set<string>();
    for (const s of sightingsData.sightings) {
      for (const k of s.keywords ?? []) present.add(k.keyword);
    }
    return Array.from(present).sort();
  }, [sightingsData]);

  const filtered = useMemo(() => {
    if (!sightingsData) return [];
    const rows = sightingsData.sightings.filter(
      (s) =>
        (!category || s.eventCategory === category) &&
        (seasonId === null || s.seasonId === seasonId) &&
        (!championName || s.championName === championName) &&
        (selectedClasses.size === 0 ||
          (s.championName && (classesByChampion.get(s.championName) ?? []).some((c) => selectedClasses.has(c)))) &&
        (!keyword || (s.keywords ?? []).some((k) => k.keyword === keyword)) &&
        (maxPrice === null || (s.price !== null && s.price <= maxPrice)) &&
        (outcome === "all" || (outcome === "winner" && s.winner) || (outcome === "topCut" && s.topCut) || (outcome === "high" && s.high)) &&
        (!query || `${s.championName ?? ""} ${s.eventName} ${usernameById.get(s.player) ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    );
    return [...rows].sort((a, b) => {
      if (sortMode === "best" && a.weightedScore !== b.weightedScore) {
        return b.weightedScore - a.weightedScore;
      }
      if (sortMode === "placement") {
        const aP = a.placement ?? Infinity;
        const bP = b.placement ?? Infinity;
        if (aP !== bP) return aP - bP;
      }
      if (sortMode === "duplicated" && a.duplicateCount !== b.duplicateCount) {
        return b.duplicateCount - a.duplicateCount;
      }
      if (sortMode === "cheapest") {
        const aPrice = a.price ?? Infinity;
        const bPrice = b.price ?? Infinity;
        if (aPrice !== bPrice) return aPrice - bPrice;
      }
      return b.eventDate.localeCompare(a.eventDate);
    });
  }, [sightingsData, category, seasonId, championName, selectedClasses, classesByChampion, keyword, maxPrice, outcome, sortMode, query, usernameById]);

  useEffect(() => {
    setVisibleCount(SIGHTINGS_PAGE_SIZE);
  }, [category, seasonId, championName, selectedClasses, keyword, maxPrice, outcome, sortMode, query]);

  const visible = filtered.slice(0, visibleCount);
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  function playerName(id: number): string {
    return usernameById.get(id) ?? `Player #${id}`;
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player, event, or champion…"
          aria-label="Search tournament results"
          className="min-w-64 flex-1 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0"
        />
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select
          value={sortMode}
          aria-label="Sort tournament results"
          onChange={(e) => setSortMode(e.target.value as SightingSortMode)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"
        >
          <option value="date">Newest</option>
          <option value="best">Best results</option>
          <option value="placement">Best placement</option>
          <option value="duplicated">Most played build</option>
          <option value="cheapest">Lowest price</option>
        </select>
      </div>

      <details className="mt-3 rounded-md border border-ctp-surface1 bg-ctp-mantle/40 px-3 py-2">
        <summary className="cursor-pointer select-none text-sm font-medium text-ctp-subtext1 hover:text-ctp-text">
          Filters{category || seasonId !== null || selectedClasses.size > 0 || keyword || maxPrice !== null || outcome !== "all" ? ` (${(category ? 1 : 0) + (seasonId !== null ? 1 : 0) + selectedClasses.size + (keyword ? 1 : 0) + (maxPrice !== null ? 1 : 0) + (outcome !== "all" ? 1 : 0)})` : ""}
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
        <span className="text-ctp-subtext0">Season:</span>
        <select
          value={seasonId ?? ""}
          aria-label="Season"
          onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All seasons</option>
          {seasonsPresent.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

      </div>

      {classesPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Class:</span>
          {classesPresent.map((cls) => (
            <button
              key={cls}
              onClick={() => toggleClass(cls)}
              aria-pressed={selectedClasses.has(cls)}
              className={`rounded-md border px-2 py-1 text-xs ${
                selectedClasses.has(cls) ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      {keywordsPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Keyword:</span>
          <select
            value={keyword ?? ""}
            aria-label="Keyword"
            onChange={(e) => setKeyword(e.target.value || null)}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            <option value="">Any keyword</option>
            {keywordsPresent.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Max price:</span>
        <button
          onClick={() => setMaxPrice(null)}
          aria-pressed={maxPrice === null}
          className={`rounded-md border px-2 py-1 text-xs ${
            maxPrice === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          Any
        </button>
        {MAX_PRICE_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setMaxPrice(p)}
            aria-pressed={maxPrice === p}
            className={`rounded-md border px-2 py-1 text-xs ${
              maxPrice === p ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Outcome:</span>
        {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => (
          <button
            key={o}
            onClick={() => setOutcome(o)}
            aria-pressed={outcome === o}
            className={`rounded-md border px-2 py-1 text-xs ${
              outcome === o ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {OUTCOME_LABELS[o]}
          </button>
        ))}
      </div>

      </details>

      {!sightingsData && <DeckResultsSkeleton />}
      {sightingsData && filtered.length === 0 && <InlineState className="mt-6">No decks match this filter yet.</InlineState>}
      {sightingsData && filtered.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} result{filtered.length === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-2 space-y-2">
        {visible.map((sighting) => (
          <DeckSightingRow
            key={sighting.deckId}
            sighting={sighting}
            playerName={playerName(sighting.player)}
            championCard={sighting.championName ? championImages.get(sighting.championName) : undefined}
          />
        ))}
      </div>

      <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + SIGHTINGS_PAGE_SIZE)} />
    </>
  );
}
