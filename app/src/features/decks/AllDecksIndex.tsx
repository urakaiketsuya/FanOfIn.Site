import { useEffect, useMemo, useState, useTransition } from "react";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useCardCombination } from "../cards/useCardCombination";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

type SortMode = "mostPlayed" | "bestPerforming" | "mostRecent";

const SORT_LABELS: Record<SortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
  mostRecent: "Most Recent",
};

const PAGE_SIZE = 30;

/**
 * Every distinct decklist (main+material signature), not just the ones popular enough for
 * Popular Decks' 2+-player bar — one-off brews get a row and a deck page here too. Distinct page
 * from Popular Decks (which keeps its own narrower, curated-feeling scope) rather than a mode
 * toggle on it, per explicit direction.
 */
export default function AllDecksIndex() {
  useDocumentTitle("All Decks", "Search and browse every distinct Grand Archive TCG decklist, filterable by Champion, element, and cards played.");
  const [championName, setChampionName] = useState<string | null>(null);
  const [elementFilter, setElementFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("mostRecent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardInput, setCardInput] = useState("");
  // Every filter here re-runs a synchronous decode over the (20MB+) deck-card-index dataset —
  // wrapped in a transition so inputs stay responsive and the page can show a "recalculating"
  // state instead of appearing to hang. Same pattern as Popular Decks.
  const [isPending, startTransition] = useTransition();

  const { decks, loading } = useDeckPopularity(championName, 1);
  const popularityIndexData = useDeckPopularityIndexData();
  const playersData = useOmnidexPlayers();
  const cardCatalog = useCardCatalog();
  const combination = useCardCombination(selectedCards);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);
  const combinationDeckIds = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);

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
    if (elementFilter.length > 0) result = result.filter((d) => d.elements.some((e) => elementFilter.includes(e)));
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
    setVisibleCount(PAGE_SIZE);
  }, [championName, elementFilter, sortMode, selectedCards]);

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">All Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Every distinct decklist (main + material), including one-off brews only one person has ever played — search
        by Champion, element, or the cards it runs. Looking for builds multiple players independently converged on?
        See Popular Decks instead.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
          onChange={(e) => {
            const value = e.target.value || null;
            startTransition(() => setChampionName(value));
          }}
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
          list="all-decks-card-options"
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
        <datalist id="all-decks-card-options">
          {cardNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
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

      <LoadMore remaining={sorted.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </div>
  );
}
