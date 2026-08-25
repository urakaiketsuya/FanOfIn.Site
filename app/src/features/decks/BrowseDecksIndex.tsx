import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useCardCombination } from "../cards/useCardCombination";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckPopularityIndexData, useDeckSightingsData } from "../topdecks/data";
import { useArchetypeData } from "../archetypes/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";

type ViewMode = "builds" | "sightings";
const VIEW_TABS: readonly ViewMode[] = ["builds", "sightings"];
const VIEW_LABELS: Record<ViewMode, string> = { builds: "By Build", sightings: "By Sighting" };

const BUILDS_PAGE_SIZE = 30;
const SIGHTINGS_PAGE_SIZE = 50;

function DeckResultsSkeleton() {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading deck results">
      <span className="sr-only">Loading deck results…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border border-ctp-surface0 bg-ctp-mantle/60 p-4"
          aria-hidden="true"
        >
          <div className="h-4 w-28 rounded bg-ctp-surface1" />
          <div className="mt-3 h-3 w-full max-w-md rounded bg-ctp-surface0" />
          <div className="mt-2 h-3 w-2/3 rounded bg-ctp-surface0" />
        </div>
      ))}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        active ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
      }`}
    >
      {children}
    </button>
  );
}

export default function BrowseDecksIndex() {
  useDocumentTitle(
    "Browse Decks",
    "Browse Grand Archive TCG decklists — grouped into distinct builds or as individual tournament results — filterable by Champion, element, cards, season, and outcome.",
  );
  const [searchParams] = useSearchParams();
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_TABS, "builds");
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Browse Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        {view === "builds"
          ? "Distinct decklists (main + material) — one row per exact build, aggregated across every player who ran it."
          : "Every public decklist sighting — one row per player per event — filterable by event type, season, keyword, and outcome."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {VIEW_TABS.map((mode) => (
          <TabButton key={mode} active={view === mode} onClick={() => setView(mode)}>
            {VIEW_LABELS[mode]}
          </TabButton>
        ))}
      </div>

      {view === "builds" ? (
        <BuildsView championName={championName} setChampionName={setChampionName} />
      ) : (
        <SightingsView championName={championName} setChampionName={setChampionName} />
      )}
    </div>
  );
}

type BuildSortMode = "mostPlayed" | "bestPerforming" | "mostRecent";
const BUILD_SORT_LABELS: Record<BuildSortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
  mostRecent: "Most Recent",
};
type MinPlayers = "any" | "2plus";

function BuildsView({
  championName,
  setChampionName,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
}) {
  const [searchParams] = useSearchParams();
  const [minPlayers, setMinPlayers] = useState<MinPlayers>(searchParams.get("minPlayers") === "2plus" ? "2plus" : "any");
  const [elementFilter, setElementFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<BuildSortMode>("mostRecent");
  const [visibleCount, setVisibleCount] = useState(BUILDS_PAGE_SIZE);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardInput, setCardInput] = useState("");
  // Every filter here re-runs a synchronous decode over the (20MB+) deck-card-index dataset —
  // wrapped in a transition so inputs stay responsive and the page can show a "recalculating"
  // state instead of appearing to hang.
  const [isPending, startTransition] = useTransition();

  const { decks: allDecks, loading } = useDeckPopularity(championName, 1);
  const popularityIndexData = useDeckPopularityIndexData();
  const playersData = useOmnidexPlayers();
  const cardCatalog = useCardCatalog();
  const combination = useCardCombination(selectedCards);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const combinationDeckIds = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);

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
    // A group's card content is identical across its main+material, so any member sighting
    // matching the combination search means the whole group matches — sideboard can differ
    // between members, so this is "played with this card at least once", not "always".
    if (selectedCards.length > 0) result = result.filter((d) => d.deckIds.some((id) => combinationDeckIds.has(id)));
    return result;
  }, [decks, elementFilter, selectedCards, combinationDeckIds]);

  function toggleElement(element: string) {
    startTransition(() =>
      setElementFilter((prev) => (prev.includes(element) ? prev.filter((e) => e !== element) : [...prev, element])),
    );
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === "bestPerforming") return b.avgWeightedScore - a.avgWeightedScore;
      if (sortMode === "mostRecent") return b.lastPlayedDate.localeCompare(a.lastPlayedDate);
      return b.playerCount - a.playerCount;
    });
  }, [filtered, sortMode]);

  useEffect(() => {
    setVisibleCount(BUILDS_PAGE_SIZE);
  }, [championName, minPlayers, elementFilter, sortMode, selectedCards]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || selectedCards.includes(name)) return;
    startTransition(() => setSelectedCards((prev) => [...prev, name]));
    setCardInput("");
  }

  function removeCard(name: string) {
    startTransition(() => setSelectedCards((prev) => prev.filter((n) => n !== name)));
  }

  const visible = sorted.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((d) => d.championName).filter((n): n is string => n !== null))),
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
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

        <span className="ml-2 text-ctp-subtext0">Players:</span>
        {(["any", "2plus"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMinPlayers(mode)}
            className={`rounded-md border px-2 py-1 text-xs ${
              minPlayers === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode === "any" ? "Any (incl. one-offs)" : "2+ (independently played)"}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-ctp-subtext0">Element:</span>
        {elementsPresent.map((element) => (
          <label key={element} className="flex items-center gap-1 text-xs text-ctp-subtext1">
            <input
              type="checkbox"
              checked={elementFilter.includes(element)}
              onChange={() => toggleElement(element)}
              className="accent-ctp-blue"
            />
            {element}
          </label>
        ))}
        {elementFilter.length > 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => setElementFilter([]))}
            className="text-xs text-ctp-subtext0 hover:text-ctp-blue hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-3">
        <span className="text-sm text-ctp-subtext0">Cards in deck:</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {selectedCards.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeCard(name)}
              className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
            >
              {name}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          list="browse-decks-card-options"
          value={cardInput}
          onChange={(e) => {
            setCardInput(e.target.value);
            if (cardNameSet.has(e.target.value)) addCard(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput);
          }}
          placeholder="Type a card name…"
          className="mt-1 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        <datalist id="browse-decks-card-options">
          {cardNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {BUILD_SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      {loading && <DeckResultsSkeleton />}
      {!loading && sorted.length === 0 && <p className="mt-6 text-ctp-subtext1">No decks match these filters.</p>}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {sorted.length} distinct deck{sorted.length === 1 ? "" : "s"} match
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
          />
        ))}
      </div>

      <LoadMore remaining={sorted.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + BUILDS_PAGE_SIZE)} />
    </>
  );
}

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

function SightingsView({
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
  const [sortMode, setSortMode] = useState<SightingSortMode>("best");
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
        (selectedClasses.size === 0 ||
          (s.championName && (classesByChampion.get(s.championName) ?? []).some((c) => selectedClasses.has(c)))) &&
        (!keyword || (s.keywords ?? []).some((k) => k.keyword === keyword)) &&
        (maxPrice === null || (s.price !== null && s.price <= maxPrice)) &&
        (outcome === "all" || (outcome === "winner" && s.winner) || (outcome === "topCut" && s.topCut) || (outcome === "high" && s.high)),
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
  }, [sightingsData, category, seasonId, championName, selectedClasses, classesByChampion, keyword, maxPrice, outcome, sortMode]);

  useEffect(() => {
    setVisibleCount(SIGHTINGS_PAGE_SIZE);
  }, [category, seasonId, championName, selectedClasses, keyword, maxPrice, outcome, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  return (
    <>
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
          {seasonsPresent.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <span className="ml-2 text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
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
      </div>

      {classesPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Class:</span>
          {classesPresent.map((cls) => (
            <button
              key={cls}
              onClick={() => toggleClass(cls)}
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
            className={`rounded-md border px-2 py-1 text-xs ${
              outcome === o ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {OUTCOME_LABELS[o]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(["best", "date", "placement", "duplicated", "cheapest"] as const).map((mode) => (
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

      {!sightingsData && <DeckResultsSkeleton />}
      {sightingsData && filtered.length === 0 && <p className="mt-6 text-ctp-subtext1">No decks match this filter yet.</p>}
      {sightingsData && filtered.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {filtered.length} deck{filtered.length === 1 ? "" : "s"} match
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
