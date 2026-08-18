import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER } from "@gatcg/shared";
import { useDeckSightingsData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DeckSightingRow from "./DeckSightingRow";

type SortMode = "best" | "date" | "placement" | "duplicated";
type Outcome = "all" | "winner" | "topCut" | "high";

const OUTCOME_LABELS: Record<Outcome, string> = {
  all: "All",
  winner: "Winners",
  topCut: "Top Cut",
  high: "High performers",
};

const PAGE_SIZE = 50;

export default function TopDecksIndex() {
  useDocumentTitle("Top Decks", "Browse public Grand Archive TCG tournament decklists, filterable by Champion, season, and outcome.");
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [championName, setChampionName] = useState<string | null>(searchParams.get("champion"));
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const filtered = useMemo(() => {
    if (!sightingsData) return [];
    const rows = sightingsData.sightings.filter(
      (s) =>
        (!category || s.eventCategory === category) &&
        (seasonId === null || s.seasonId === seasonId) &&
        (!championName || s.championName === championName) &&
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
      return b.eventDate.localeCompare(a.eventDate);
    });
  }, [sightingsData, category, seasonId, championName, outcome, sortMode]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, seasonId, championName, outcome, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const championImages = useChampionCardImages(Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))));

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Top Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Every public decklist across ingested events, filterable by event type, season, Champion, and outcome.
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
        {(["best", "date", "placement", "duplicated"] as const).map((mode) => (
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

      {visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="mt-4 w-full rounded-md border border-ctp-surface1 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
        >
          Load more ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
