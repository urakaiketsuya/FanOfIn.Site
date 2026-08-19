import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useDeckSightingsData } from "./data";
import { useArchetypeData } from "../archetypes/data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DeckSightingRow from "./DeckSightingRow";
import LoadMore from "../../components/LoadMore";

type SortMode = "best" | "date" | "placement" | "duplicated" | "cheapest";
type Outcome = "all" | "winner" | "topCut" | "high";

const OUTCOME_LABELS: Record<Outcome, string> = {
  all: "All",
  winner: "Winners",
  topCut: "Top Cut",
  high: "High performers",
};

/** A deck with no known price is excluded whenever a max-price filter is active — can't call something "budget" without knowing what it costs. */
const MAX_PRICE_OPTIONS = [25, 50, 100, 250];

const PAGE_SIZE = 50;

export default function TopDecksIndex() {
  useDocumentTitle(
    "Top Decks",
    "Browse public Grand Archive TCG tournament decklists, filterable by Champion, class, season, and outcome.",
  );
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const archetypeData = useArchetypeData();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
    setVisibleCount(PAGE_SIZE);
  }, [category, seasonId, championName, selectedClasses, keyword, maxPrice, outcome, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Top Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Every public decklist across ingested events, filterable by event type, season, Champion, class, keyword, and outcome.
      </p>

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

      {!sightingsData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
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

      <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </div>
  );
}
