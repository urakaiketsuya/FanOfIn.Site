import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import CardSearchPicker from "../../components/CardSearchPicker";
import ElementIcon from "../../components/ElementIcon";
import LoadMore from "../../components/LoadMore";
import { InlineState } from "../../components/ui/ContentState";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardCombination } from "../cards/useCardCombination";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "../popular/PopularDeckRow";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useEventNameById, useOmnidexPlayers } from "../tournaments/data";
import DeckResultsSkeleton from "./DeckResultsSkeleton";

const BUILDS_PAGE_SIZE = 30;

type BuildSortMode = "mostPlayed" | "bestPerforming" | "mostRecent";
const BUILD_SORT_LABELS: Record<BuildSortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
  mostRecent: "Most Recent",
};
type MinPlayers = "any" | "2plus";

export default function TournamentBuildsView({
  championName,
  setChampionName,
}: {
  championName: string | null;
  setChampionName: (v: string | null) => void;
}) {
  const [searchParams] = useSearchParams();
  const [minPlayers, setMinPlayers] = useState<MinPlayers>(searchParams.get("minPlayers") === "any" ? "any" : "2plus");
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
  const eventNameById = useEventNameById();
  const cardCatalog = useCardCatalog();
  const combination = useCardCombination(selectedCards);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
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
    if (selectedCards.includes(name)) return;
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
          {(Object.keys(BUILD_SORT_LABELS) as BuildSortMode[]).map((mode) => (
            <option key={mode} value={mode}>{mode === "mostRecent" ? "Newest" : BUILD_SORT_LABELS[mode]}</option>
          ))}
        </select>
      </div>

      <details className="mt-3 rounded-md border border-ctp-surface1 bg-ctp-mantle/40 px-3 py-2">
        <summary className="cursor-pointer select-none text-sm font-medium text-ctp-subtext1 hover:text-ctp-text">
          Filters{minPlayers === "2plus" || elementFilter.length > 0 || selectedCards.length > 0 ? ` (${(minPlayers === "2plus" ? 1 : 0) + elementFilter.length + selectedCards.length})` : ""}
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Players:</span>
          {(["2plus", "any"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMinPlayers(mode)}
              aria-pressed={minPlayers === mode}
              className={`rounded-md border px-2 py-1 text-xs ${
                minPlayers === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {mode === "any" ? "Include one-offs" : "Played by 2+ people"}
            </button>
          ))}
        </div>

        <fieldset className="mt-3" aria-labelledby="browse-decks-elements-label">
        <div className="flex min-h-6 items-center gap-2">
          <span id="browse-decks-elements-label" className="text-sm text-ctp-subtext0">Elements</span>
          {elementFilter.length > 1 && <span className="text-[11px] text-ctp-overlay1">Match all selected</span>}
          {elementFilter.length > 0 && (
            <button
              type="button"
              onClick={() => startTransition(() => setElementFilter([]))}
              className="ml-auto rounded px-1.5 py-0.5 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {elementsPresent.map((element) => {
            const selected = elementFilter.includes(element);
            return (
              <label
                key={element}
                className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ctp-blue ${
                  selected
                    ? "border-ctp-blue bg-ctp-blue/15 text-ctp-blue"
                    : "border-ctp-surface1 bg-ctp-mantle text-ctp-subtext1 hover:border-ctp-overlay0 hover:bg-ctp-surface0 hover:text-ctp-text"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleElement(element)}
                  className="sr-only"
                />
                <span aria-hidden="true"><ElementIcon element={element} size={18} className="shrink-0" /></span>
                <span className="capitalize">{element.toLowerCase()}</span>
                {selected && <span aria-hidden="true" className="ml-0.5 text-sm leading-none">✓</span>}
              </label>
            );
          })}
        </div>
        </fieldset>

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
        <CardSearchPicker
          options={cardNames.filter((name) => !selectedCards.includes(name))}
          value={cardInput}
          onChange={setCardInput}
          onSelect={addCard}
          placeholder="Type a card name…"
          ariaLabel="Cards in deck"
          className="mt-1 w-full max-w-sm"
        />
        </div>

      </details>

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
