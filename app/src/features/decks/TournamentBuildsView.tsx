import DeckDateRangeFilter from "./DeckDateRangeFilter";
import { deckDateInRange } from "./deckDateRange";
import { balancedSort, type SortPriority } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import LoadMore from "../../components/LoadMore";
import { EmptyState } from "../../components/ui/ContentState";
import FilterPanel from "../../components/filters/FilterPanel";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SegmentedFilter from "../../components/filters/SegmentedFilter";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useDeckSightingsData, useDeckPopularityIndexData } from "../topdecks/data";
import DeckResultsSkeleton from "./DeckResultsSkeleton";
import DeckContentFilterControls from "./DeckContentFilterControls";
import { deckContentFilterCount, deckContentFilterLabels, deckContentRelevance, deckMatchesContentFilters, emptyDeckContentFilters, type DeckContentFilterState } from "./deckContentFilters";

const BUILDS_PAGE_SIZE = 30;

type BuildSortMode = "mostPlayed" | "bestPerforming" | "mostRecent" | "relevance" | "cheapest" | "placement";
const BUILD_SORT_LABELS: Record<BuildSortMode, string> = {
  cheapest: "Lowest price",
  placement: "Best placement",
  mostPlayed: "Most players",
  bestPerforming: "Best results",
  mostRecent: "Newest",
  relevance: "Relevance",
};
const MIN_PLAYERS = [1, 2, 5, 10, 25];

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
  const [minPlayers, setMinPlayers] = useState<number>(searchParams.get("minPlayers") === "any" ? 1 : 2);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [elementFilter, setElementFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<BuildSortMode>("mostPlayed");
  const [secondarySortMode, setSecondarySortMode] = useState<BuildSortMode | null>(null);
  const [sortPriority, setSortPriority] = useState<SortPriority>("equal");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visibleCount, setVisibleCount] = useState(BUILDS_PAGE_SIZE);
  // Filtering and sorting the cached builds can still be expensive. Transitions let
  // controls update first while the results show their recalculating state.
  const [isPending, startTransition] = useTransition();

  const { decks: allDecks, loading, error, retry } = useDeckPopularity(championName, 1);
  const cardIndexData = useDeckCardIndexData();
  const popularityIndexData = useDeckPopularityIndexData();
  const popularityStatus = usePublishedDataStatus("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json");
  const cardIndexStatus = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json");
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);

  const sightingsData = useDeckSightingsData();
  const priceStatus = usePublishedDataStatus("analysis-deck-sightings", "/data/analysis/deck-sightings.json");
  const priceBySignature = useMemo(() => {
    const byDeck = new Map((sightingsData?.sightings ?? []).map(s => [s.deckId, s.price]));
    return new Map(allDecks.map(deck => [deck.signature, deck.deckIds.map(id => byDeck.get(id)).find(price => price != null) ?? null]));
  }, [allDecks, sightingsData]);
  const decks = useMemo(
    () => allDecks.filter((d) => d.playerCount >= minPlayers),
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
    let result = decks.filter(d => deckDateInRange(d.lastPlayedDate, dateFrom, dateTo));
    if (maxPrice !== null) result = result.filter(d => { const price = priceBySignature.get(d.signature); return price != null && price <= maxPrice; });
    if (elementFilter.length > 0) result = result.filter((d) => elementFilter.every((e) => d.elements.includes(e)));
    if (deckContentFilterCount(contentFilters) > 0) result = result.filter((d) => deckMatchesContentFilters([...d.main, ...d.material], contentFilters, cardsByName));
    return result;
  }, [decks, dateFrom, dateTo, maxPrice, priceBySignature, elementFilter, contentFilters, cardsByName]);

  function toggleElement(element: string) {
    startTransition(() =>
      setElementFilter((prev) => (prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element])),
    );
  }

  const sorted = useMemo(() => {
    const compare = (mode: BuildSortMode, a: (typeof filtered)[number], b: (typeof filtered)[number]) => {
      if (mode === "relevance") {
        // Group into 5% bands so a meaningful secondary sort can order near-equivalent matches.
        const aBand = Math.round(deckContentRelevance([...a.main, ...a.material], contentFilters, cardsByName) * 20);
        const bBand = Math.round(deckContentRelevance([...b.main, ...b.material], contentFilters, cardsByName) * 20);
        return bBand - aBand;
      }
      if (mode === "cheapest" || mode === "placement") {
        const av = mode === "cheapest" ? priceBySignature.get(a.signature) : a.bestPlacement;
        const bv = mode === "cheapest" ? priceBySignature.get(b.signature) : b.bestPlacement;
        const ap = av == null ? Infinity : Number(av.toFixed(2));
        const bp = bv == null ? Infinity : Number(bv.toFixed(2));
        return ap === bp ? 0 : ap - bp;
      }
      if (mode === "bestPerforming") return b.avgWeightedScore - a.avgWeightedScore;
      if (mode === "mostRecent") return b.lastPlayedDate.localeCompare(a.lastPlayedDate);
      return b.playerCount - a.playerCount;
    };
    const primary = (a: (typeof filtered)[number], b: (typeof filtered)[number]) => compare(sortMode, a, b);
    const fallback = (a: Parameters<typeof primary>[0], b: Parameters<typeof primary>[0]) => b.lastPlayedDate.localeCompare(a.lastPlayedDate);
    return secondarySortMode
      ? balancedSort(filtered, primary, (a, b) => compare(secondarySortMode, a, b), fallback, sortPriority)
      : [...filtered].sort((a, b) => primary(a, b) || fallback(a, b));
  }, [filtered, priceBySignature, sortMode, secondarySortMode, sortPriority, contentFilters, cardsByName]);

  useEffect(() => {
    if (secondarySortMode === sortMode) setSecondarySortMode(null);
    if (deckContentFilterCount(contentFilters) > 0) return;
    if (sortMode === "relevance") setSortMode("mostPlayed");
    if (secondarySortMode === "relevance") setSecondarySortMode(null);
  }, [sortMode, secondarySortMode, contentFilters]);

  useEffect(() => {
    setVisibleCount(BUILDS_PAGE_SIZE);
  }, [championName, minPlayers, maxPrice, elementFilter, sortMode, secondarySortMode, sortPriority, dateFrom, dateTo, contentFilters]);

  const visible = sorted.slice(0, visibleCount);
  const activeFilterCount = (dateFrom || dateTo ? 1 : 0) + (minPlayers > 1 ? 1 : 0) + (maxPrice !== null ? 1 : 0) + elementFilter.length + deckContentFilterCount(contentFilters);
  const activeFilterLabels = [
    ...(dateFrom || dateTo ? [`Last played: ${dateFrom || "Any start"} – ${dateTo || "Any end"}`] : []),
    ...(minPlayers > 1 ? [`${minPlayers}+ players`] : []),
    ...(maxPrice !== null ? [`Up to $${maxPrice}`] : []),
    ...elementFilter.map((element) => `Deck element: ${element}`),
    ...deckContentFilterLabels(contentFilters),
  ];
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((d) => d.championName).filter((n): n is string => n !== null))));

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => setChampionName(e.target.value || null)}
          className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text sm:flex-1"
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
          aria-label="Sort most played decks"
          onChange={(e) => { const value = e.target.value as BuildSortMode; startTransition(() => setSortMode(value)); }}
          className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text sm:flex-1"
        >
          {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).filter((mode) => mode !== "relevance" || deckContentFilterCount(contentFilters) > 0).map((mode) => (
            <option key={mode} value={mode}>{mode === "mostRecent" ? "Newest" : BUILD_SORT_LABELS[mode]}</option>
          ))}
        </select>
      </div>

      <details className="group mt-2 text-xs text-ctp-subtext0">
        <summary className="flex min-h-control w-fit cursor-pointer list-none items-center gap-2 rounded px-2 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden"><DisclosureChevron className="group-open:rotate-180" />More sorting options</summary>
        <label className="mt-2 flex flex-wrap items-center gap-2">
          <span>Second choice</span>
          <select value={secondarySortMode ?? ""} onChange={(e) => { const value = (e.target.value || null) as BuildSortMode | null; startTransition(() => setSecondarySortMode(value)); }} className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-xs text-ctp-text">
            <option value="">None</option>
            {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).filter((mode) => mode !== sortMode && (mode !== "relevance" || deckContentFilterCount(contentFilters) > 0)).map((mode) => <option key={mode} value={mode}>{mode === "mostRecent" ? "Newest" : BUILD_SORT_LABELS[mode]}</option>)}
          </select>
        </label>
        {secondarySortMode && <label className="mt-2 flex flex-wrap items-center gap-2">
          <span>Priority</span>
          <select value={sortPriority} onChange={(e) => { const value = e.target.value as SortPriority; startTransition(() => setSortPriority(value)); }} className="min-h-control min-w-0 max-w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-xs text-ctp-text">
            <option value="equal">Equal balance</option>
            <option value="favor-first">Favor first (2× weight)</option>
            <option value="tie-break">First choice; second breaks ties</option>
          </select>
        </label>}
      </details>

      <FilterPanel activeCount={activeFilterCount} activeLabels={activeFilterLabels} resultLabel={`Show ${sorted.length.toLocaleString()} build${sorted.length === 1 ? "" : "s"}`} onClear={() => startTransition(() => { setDateFrom(""); setDateTo(""); setMinPlayers(1); setMaxPrice(null); setElementFilter([]); setContentFilters(() => emptyDeckContentFilters()); })}>
        <SegmentedFilter label="Players" options={MIN_PLAYERS.map(value => ({ value, label: value === 1 ? "Any" : `${value}+ players` }))} value={minPlayers} onChange={value => startTransition(() => setMinPlayers(value))} />
        <SegmentedFilter label="Max price" options={[{ value: 0, label: "Any" }, ...[25, 50, 100, 250, 500, 1000].map(value => ({ value, label: `$${value}` }))]} value={maxPrice ?? 0} onChange={value => startTransition(() => setMaxPrice(value || null))} />
        <MultiSelectFilter label="Elements" hint={elementFilter.length > 1 ? "Match all selected" : undefined} options={elementsPresent.map((element) => ({ value: element, text: element.toLowerCase() }))} selected={new Set(elementFilter)} onToggle={toggleElement} iconKind="elements" />
        <DeckDateRangeFilter label="Last played" from={dateFrom} to={dateTo} onFrom={value => startTransition(() => setDateFrom(value))} onTo={value => startTransition(() => setDateTo(value))} />
        <DeckContentFilterControls filters={contentFilters} setFilters={setContentFilters} />
      </FilterPanel>

      <PublishedSourceStatus label="Build prices" status={priceStatus} hasData={Boolean(sightingsData)} />
      <PublishedSourceStatus label="Most played deck results" status={popularityStatus} hasData={Boolean(popularityIndexData)} />
      <PublishedSourceStatus label="Most played deck lists" status={cardIndexStatus} hasData={Boolean(cardIndexData)} />
      {error && <div role="alert" className="mt-4"><p>{error}</p><Button onClick={retry}>Try again</Button></div>}
      {loading && popularityStatus.phase !== "error" && cardIndexStatus.phase !== "error" && <DeckResultsSkeleton />}
      {!loading && !error && sorted.length === 0 && <EmptyState className="mt-6" title="No matching decks" description="Include all champions and players to explore more lists." action={<Button onClick={() => startTransition(() => { setChampionName(null); setDateFrom(""); setDateTo(""); setMinPlayers(1); setMaxPrice(null); setElementFilter([]); setContentFilters(() => emptyDeckContentFilters()); })}>Clear filters</Button>} />}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          Showing {visible.length.toLocaleString()} of {sorted.length.toLocaleString()} build{sorted.length === 1 ? "" : "s"}
          {isPending && " · Recalculating…"}
        </p>
      )}

      <div className={`mt-2 grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${isPending ? "opacity-50" : ""}`}>
        {visible.map((deck) => (
          <PopularDeckRow
            key={deck.signature}
            deck={deck}
            price={priceBySignature.get(deck.signature) ?? null}
            championCard={deck.championName ? championImages.get(deck.championName) : undefined}
          />
        ))}
      </div>

      <LoadMore remaining={sorted.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + BUILDS_PAGE_SIZE)} />
    </>
  );
}
