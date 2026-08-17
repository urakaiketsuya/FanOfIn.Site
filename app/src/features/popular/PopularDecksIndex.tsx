import { useEffect, useMemo, useState } from "react";
import { useDeckPopularity } from "./useDeckPopularity";
import { useDeckSightingsData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import PopularDeckRow from "./PopularDeckRow";

type SortMode = "mostPlayed" | "bestPerforming";

const SORT_LABELS: Record<SortMode, string> = {
  mostPlayed: "Most Played",
  bestPerforming: "Best Performing",
};

const PAGE_SIZE = 30;

export default function PopularDecksIndex() {
  const [championName, setChampionName] = useState<string | null>(null);
  const [elementFilter, setElementFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("mostPlayed");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { decks, loading } = useDeckPopularity(championName);
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();

  const championsPresent = useMemo(() => {
    if (!sightingsData) return [];
    return Array.from(new Set(sightingsData.sightings.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [sightingsData]);

  const elementsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) for (const e of d.elements) set.add(e);
    return Array.from(set).sort();
  }, [decks]);

  const filtered = useMemo(() => {
    if (!elementFilter) return decks;
    return decks.filter((d) => d.elements.includes(elementFilter));
  }, [decks, elementFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      sortMode === "bestPerforming" ? b.avgWeightedScore - a.avgWeightedScore : b.playerCount - a.playerCount,
    );
  }, [filtered, sortMode]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [championName, elementFilter, sortMode]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  const visible = sorted.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((d) => d.championName).filter((n): n is string => n !== null))),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Popular Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Exact decklists (main + material) played by more than one person — separate from Champions and Archetypes,
        which group by character or class/element rather than the specific build.
      </p>

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

        <span className="ml-2 text-ctp-subtext0">Element:</span>
        <select
          value={elementFilter ?? ""}
          onChange={(e) => setElementFilter(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All elements</option>
          {elementsPresent.map((element) => (
            <option key={element} value={element}>
              {element}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
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
      {!loading && sorted.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No decks played by more than one person yet.</p>
      )}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-ctp-subtext0">
          {sorted.length} distinct deck{sorted.length === 1 ? "" : "s"} match
        </p>
      )}

      <div className="mt-2 space-y-2">
        {visible.map((deck) => (
          <PopularDeckRow
            key={deck.signature}
            deck={deck}
            playerName={playerName}
            championCard={deck.championName ? championImages.get(deck.championName) : undefined}
          />
        ))}
      </div>

      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="mt-4 w-full rounded-md border border-ctp-surface1 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
        >
          Load more ({sorted.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
