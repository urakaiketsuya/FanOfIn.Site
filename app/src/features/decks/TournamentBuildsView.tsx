import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import LoadMore from "../../components/LoadMore";
import { InlineState } from "../../components/ui/ContentState";
import FilterPanel from "../../components/filters/FilterPanel";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SegmentedFilter from "../../components/filters/SegmentedFilter";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useEventNameById, usePlayerNameById } from "../tournaments/data";
import DeckResultsSkeleton from "./DeckResultsSkeleton";
import DeckContentFilterControls from "./DeckContentFilterControls";
import { deckContentFilterCount, deckContentRelevance, deckMatchesContentFilters, emptyDeckContentFilters, type DeckContentFilterState } from "./deckContentFilters";

const BUILDS_PAGE_SIZE = 30;

type BuildSortMode = "mostPlayed" | "bestPerforming" | "mostRecent" | "relevance";
const BUILD_SORT_LABELS: Record<BuildSortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
  mostRecent: "Most Recent",
  relevance: "Relevance",
};
type MinPlayers = "any" | "2plus";

export default function TournamentBuildsView({
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
  const [searchParams] = useSearchParams();
  const [minPlayers, setMinPlayers] = useState<MinPlayers>(searchParams.get("minPlayers") === "any" ? "any" : "2plus");
  const [elementFilter, setElementFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<BuildSortMode>("mostRecent");
  const [visibleCount, setVisibleCount] = useState(BUILDS_PAGE_SIZE);
  // Every filter here re-runs a synchronous decode over the (20MB+) deck-card-index dataset —
  // wrapped in a transition so inputs stay responsive and the page can show a "recalculating"
  // state instead of appearing to hang.
  const [isPending, startTransition] = useTransition();

  const { decks: allDecks, loading } = useDeckPopularity(championName, 1);
  const popularityIndexData = useDeckPopularityIndexData();
  const playerName = usePlayerNameById();
  const eventNameById = useEventNameById();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);

  const decks = useMemo(
    () => (minPlayers === "2plus" ? allDecks.filter((d) => d.playerCount >= 2) : allDecks),
    [allDecks, minPlayers],
  );

  const championsPresent = useMemo(() => {
    if (!popularityIndexData) return [];
    return Array.from(new Set(popularityIndexData.entries.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [popularityIndexData]);

  const elementsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) for (const e of d.elements) set.add(e);
    return Array.from(set).sort();
  }, [decks]);

  const filtered = useMemo(() => {
    let result = decks;
    if (elementFilter.length > 0) result = result.filter((d) => elementFilter.every((e) => d.elements.includes(e)));
    if (deckContentFilterCount(contentFilters) > 0) result = result.filter((d) => deckMatchesContentFilters([...d.main, ...d.material], contentFilters, cardsByName));
    return result;
  }, [decks, elementFilter, contentFilters, cardsByName]);

  function toggleElement(element: string) {
    startTransition(() =>
      setElementFilter((prev) => (prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element])),
    );
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === "relevance") {
        const delta = deckContentRelevance([...b.main, ...b.material], contentFilters, cardsByName) - deckContentRelevance([...a.main, ...a.material], contentFilters, cardsByName);
        if (delta !== 0) return delta;
        return b.lastPlayedDate.localeCompare(a.lastPlayedDate);
      }
      if (sortMode === "bestPerforming") return b.avgWeightedScore - a.avgWeightedScore;
      if (sortMode === "mostRecent") return b.lastPlayedDate.localeCompare(a.lastPlayedDate);
      return b.playerCount - a.playerCount;
    });
  }, [filtered, sortMode, contentFilters, cardsByName]);

  useEffect(() => {
    if (sortMode === "relevance" && deckContentFilterCount(contentFilters) === 0) setSortMode("mostRecent");
  }, [sortMode, contentFilters]);

  useEffect(() => {
    setVisibleCount(BUILDS_PAGE_SIZE);
  }, [championName, minPlayers, elementFilter, sortMode, contentFilters]);

  const visible = sorted.slice(0, visibleCount);
  const activeFilterCount = (minPlayers === "2plus" ? 1 : 0) + elementFilter.length + deckContentFilterCount(contentFilters);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((d) => d.championName).filter((n): n is string => n !== null))),
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={sortMode}
          aria-label="Sort builds"
          onChange={(e) => setSortMode(e.target.value as BuildSortMode)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).filter((mode) => mode !== "relevance" || deckContentFilterCount(contentFilters) > 0).map((mode) => (
            <option key={mode} value={mode}>{mode === "mostRecent" ? "Newest" : BUILD_SORT_LABELS[mode]}</option>
          ))}
        </select>
      </div>

      <FilterPanel activeCount={activeFilterCount} onClear={() => startTransition(() => { setMinPlayers("any"); setElementFilter([]); setContentFilters(() => emptyDeckContentFilters()); })}>
        <SegmentedFilter label="Players" options={[{ value: "2plus", label: "Played by 2+ people" }, { value: "any", label: "Include one-offs" }]} value={minPlayers} onChange={setMinPlayers} />
        <MultiSelectFilter label="Elements" hint={elementFilter.length > 1 ? "Match all selected" : undefined} options={elementsPresent.map((element) => ({ value: element, text: element.toLowerCase() }))} selected={new Set(elementFilter)} onToggle={toggleElement} iconKind="elements" />
        <DeckContentFilterControls filters={contentFilters} setFilters={setContentFilters} />
      </FilterPanel>

      {loading && <DeckResultsSkeleton />}
      {!loading && sorted.length === 0 && <InlineState className="mt-6">No decks match these filters.</InlineState>}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          Showing {visible.length.toLocaleString()} of {sorted.length.toLocaleString()} build{sorted.length === 1 ? "" : "s"}
          {isPending && " — recalculating…"}
        </p>
      )}

      <div className={`mt-2 space-y-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {visible.map((deck) => (
          <PopularDeckRow
            key={deck.signature}
            deck={deck}
            playerName={playerName}
            championCard={deck.championName ? championImages.get(deck.championName) : undefined}
            latestEventName={deck.lastEventId ? eventNameById.get(deck.lastEventId) : undefined}
          />
        ))}
      </div>

      <LoadMore remaining={sorted.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + BUILDS_PAGE_SIZE)} />
    </>
  );
}
