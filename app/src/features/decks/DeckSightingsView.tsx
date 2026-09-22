import { useEffect, useMemo, useState } from "react";
import { decodeCardLines, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import LoadMore from "../../components/LoadMore";
import { InlineState } from "../../components/ui/ContentState";
import { useArchetypeData, useDeckCardIndexData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import { useDeckSightingsData } from "../topdecks/data";
import { usePlayerNameById } from "../tournaments/data";
import DeckResultsSkeleton from "./DeckResultsSkeleton";
import FilterGroup from "../../components/filters/FilterGroup";
import FilterPanel from "../../components/filters/FilterPanel";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SegmentedFilter from "../../components/filters/SegmentedFilter";
import { useCardCatalog } from "../cards/useCardCatalog";
import DeckContentFilterControls from "./DeckContentFilterControls";
import { deckContentFilterCount, deckContentFilterLabels, deckContentRelevance, deckMatchesContentFilters, emptyDeckContentFilters, type DeckContentFilterState } from "./deckContentFilters";

const SIGHTINGS_PAGE_SIZE = 50;

type SightingSortMode = "best" | "date" | "placement" | "duplicated" | "cheapest" | "relevance";
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
  contentFilters,
  setContentFilters,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
  contentFilters: DeckContentFilterState;
  setContentFilters: (update: (previous: DeckContentFilterState) => DeckContentFilterState) => void;
}) {
  const sightingsData = useDeckSightingsData();
  const playerName = usePlayerNameById();
  const archetypeData = useArchetypeData();
  const cardIndexData = useDeckCardIndexData(deckContentFilterCount(contentFilters) > 0);
  const contentFiltersLoading = deckContentFilterCount(contentFilters) > 0 && !cardIndexData?.cardNames;
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);

  const contentRelevanceByDeckId = useMemo(() => {
    if (deckContentFilterCount(contentFilters) === 0) return null;
    if (!cardIndexData?.cardNames) return new Map<string, number>();
    const matches = new Map<string, number>();
    for (const deck of cardIndexData.decks) {
      const lines = decodeCardLines([...deck.main, ...deck.material], cardIndexData.cardNames);
      if (deckMatchesContentFilters(lines, contentFilters, cardsByName)) matches.set(deck.deckId, deckContentRelevance(lines, contentFilters, cardsByName));
    }
    return matches;
  }, [cardIndexData, contentFilters, cardsByName]);

  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [sortMode, setSortMode] = useState<SightingSortMode>("date");
  const [secondarySortMode, setSecondarySortMode] = useState<SightingSortMode | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(SIGHTINGS_PAGE_SIZE);

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
        (!contentRelevanceByDeckId || contentRelevanceByDeckId.has(s.deckId)) &&
        (selectedClasses.size === 0 ||
          (s.championName && (classesByChampion.get(s.championName) ?? []).some((c) => selectedClasses.has(c)))) &&
        (!keyword || (s.keywords ?? []).some((k) => k.keyword === keyword)) &&
        (maxPrice === null || (s.price !== null && s.price <= maxPrice)) &&
        (outcome === "all" || (outcome === "winner" && s.winner) || (outcome === "topCut" && s.topCut) || (outcome === "high" && s.high)) &&
        (!query || `${s.championName ?? ""} ${s.eventName} ${playerName(s.player)}`.toLowerCase().includes(query.toLowerCase())),
    );
    const compare = (mode: SightingSortMode, a: (typeof rows)[number], b: (typeof rows)[number]) => {
      if (mode === "relevance") {
        const aBand = Math.round((contentRelevanceByDeckId?.get(a.deckId) ?? 0) * 20);
        const bBand = Math.round((contentRelevanceByDeckId?.get(b.deckId) ?? 0) * 20);
        return bBand - aBand;
      }
      if (mode === "best") return b.weightedScore - a.weightedScore;
      if (mode === "placement") {
        const aP = a.placement ?? Infinity;
        const bP = b.placement ?? Infinity;
        return aP === bP ? 0 : aP - bP;
      }
      if (mode === "duplicated") return b.duplicateCount - a.duplicateCount;
      if (mode === "cheapest") {
        const aPrice = a.price ?? Infinity;
        const bPrice = b.price ?? Infinity;
        return aPrice === bPrice ? 0 : aPrice - bPrice;
      }
      return b.eventDate.localeCompare(a.eventDate);
    };
    return [...rows].sort((a, b) => {
      const primary = compare(sortMode, a, b);
      if (primary !== 0) return primary;
      if (secondarySortMode) {
        const secondary = compare(secondarySortMode, a, b);
        if (secondary !== 0) return secondary;
      }
      return b.eventDate.localeCompare(a.eventDate);
    });
  }, [sightingsData, category, seasonId, championName, contentRelevanceByDeckId, selectedClasses, classesByChampion, keyword, maxPrice, outcome, sortMode, secondarySortMode, query, playerName]);

  useEffect(() => {
    if (secondarySortMode === sortMode) setSecondarySortMode(null);
    if (deckContentFilterCount(contentFilters) > 0) return;
    if (sortMode === "relevance") setSortMode("date");
    if (secondarySortMode === "relevance") setSecondarySortMode(null);
  }, [sortMode, secondarySortMode, contentFilters]);

  useEffect(() => {
    setVisibleCount(SIGHTINGS_PAGE_SIZE);
  }, [category, seasonId, championName, contentFilters, selectedClasses, keyword, maxPrice, outcome, sortMode, secondarySortMode, query]);

  const visible = filtered.slice(0, visibleCount);
  const activeFilterCount = (category ? 1 : 0) + (seasonId !== null ? 1 : 0) + selectedClasses.size + (keyword ? 1 : 0) + (maxPrice !== null ? 1 : 0) + (outcome !== "all" ? 1 : 0) + deckContentFilterCount(contentFilters);
  const activeFilterLabels = [
    ...(championName ? [`Champion: ${championName}`] : []),
    ...(category ? [EVENT_CATEGORY_LABELS[category] ?? category] : []),
    ...(seasonId !== null ? [seasonsPresent.find(([id]) => id === seasonId)?.[1] ?? `Season ${seasonId}`] : []),
    ...Array.from(selectedClasses, (value) => `Champion class: ${value}`),
    ...(keyword ? [`Keyword: ${keyword}`] : []),
    ...(maxPrice !== null ? [`Up to $${maxPrice}`] : []),
    ...(outcome === "all" ? [] : [OUTCOME_LABELS[outcome]]),
    ...deckContentFilterLabels(contentFilters),
  ];
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player, event, or champion…"
          aria-label="Search tournament results"
          className="col-span-2 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 sm:min-w-64 sm:flex-1"
        />
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select
          value={sortMode}
          aria-label="Sort tournament results"
          onChange={(e) => setSortMode(e.target.value as SightingSortMode)}
          className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"
        >
          <option value="date">Newest</option>
          <option value="best">Best results</option>
          <option value="placement">Best placement</option>
          <option value="duplicated">Most played build</option>
          <option value="cheapest">Lowest price</option>
          {deckContentFilterCount(contentFilters) > 0 && <option value="relevance">Relevance</option>}
        </select>
      </div>

      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">More sorting options</summary>
        <label className="mt-2 flex items-center gap-2">
          <span>Then sort by</span>
          <select value={secondarySortMode ?? ""} onChange={(e) => setSecondarySortMode((e.target.value || null) as SightingSortMode | null)} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-xs text-ctp-text">
            <option value="">None</option>
            {sortMode !== "date" && <option value="date">Newest</option>}
            {sortMode !== "best" && <option value="best">Best results</option>}
            {sortMode !== "placement" && <option value="placement">Best placement</option>}
            {sortMode !== "duplicated" && <option value="duplicated">Most played build</option>}
            {sortMode !== "cheapest" && <option value="cheapest">Lowest price</option>}
            {sortMode !== "relevance" && deckContentFilterCount(contentFilters) > 0 && <option value="relevance">Relevance</option>}
          </select>
        </label>
      </details>

      <FilterPanel activeCount={activeFilterCount} activeLabels={activeFilterLabels} resultLabel={`Show ${filtered.length.toLocaleString()} result${filtered.length === 1 ? "" : "s"}`} onClear={() => { setCategory(null); setSeasonId(null); setSelectedClasses(new Set()); setKeyword(null); setMaxPrice(null); setOutcome("all"); setContentFilters(() => emptyDeckContentFilters()); }}>
        <SegmentedFilter label="Type" options={[{ value: "", label: "All" }, ...categoriesPresent.map((value) => ({ value, label: EVENT_CATEGORY_LABELS[value] ?? value }))]} value={category ?? ""} onChange={(value) => setCategory(value || null)} />
        <FilterGroup label="Season">
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
        </FilterGroup>

      {classesPresent.length > 0 && (
        <MultiSelectFilter label="Class" options={classesPresent.map((value) => ({ value, text: value }))} selected={selectedClasses} onToggle={toggleClass} iconKind="classes" />
      )}

      {keywordsPresent.length > 0 && (
        <FilterGroup label="Keyword">
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
        </FilterGroup>
      )}
        <SegmentedFilter label="Max price" options={[{ value: 0, label: "Any" }, ...MAX_PRICE_OPTIONS.map((value) => ({ value, label: `$${value}` }))]} value={maxPrice ?? 0} onChange={(value) => setMaxPrice(value || null)} />
        <SegmentedFilter label="Outcome" options={(Object.keys(OUTCOME_LABELS) as Outcome[]).map((value) => ({ value, label: OUTCOME_LABELS[value] }))} value={outcome} onChange={setOutcome} />
        <DeckContentFilterControls filters={contentFilters} setFilters={setContentFilters} />
      </FilterPanel>

      {(!sightingsData || contentFiltersLoading) && <DeckResultsSkeleton />}
      {sightingsData && !contentFiltersLoading && filtered.length === 0 && <InlineState className="mt-6">No decks match this filter yet.</InlineState>}
      {sightingsData && !contentFiltersLoading && filtered.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} result{filtered.length === 1 ? "" : "s"}
        </p>
      )}

      <div className={`mt-2 grid gap-3 lg:grid-cols-2 lg:items-start ${contentFiltersLoading ? "hidden" : ""}`}>
        {visible.map((sighting) => (
          <DeckSightingRow
            key={sighting.deckId}
            sighting={sighting}
            playerName={playerName(sighting.player)}
            championCard={sighting.championName ? championImages.get(sighting.championName) : undefined}
            browseCard
          />
        ))}
      </div>

      <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + SIGHTINGS_PAGE_SIZE)} />
    </>
  );
}
