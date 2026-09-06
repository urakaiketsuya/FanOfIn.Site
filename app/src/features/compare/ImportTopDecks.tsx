import { useMemo, useState } from "react";
import { useDeckSightingsData } from "../topdecks/data";
import { useArchetypeTaxonomyData } from "../archetypes/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import type { ComparedDeck } from "./types";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

const PAGE_SIZE = 20;
type Mode = "placement" | "archetype";

/** Browse top-performing decks by Champion — ranked by the same tier-weighted placement score Top
 * Decks' "best" sort uses, or narrowed to one named build's own members — and add them straight
 * to the compare set via DeckSightingRow's existing onAdd/added toggle. */
export default function ImportTopDecks({
  comparedKeys,
  onToggle,
}: {
  comparedKeys: Set<string>;
  onToggle: (deck: ComparedDeck) => void;
}) {
  const sightingsData = useDeckSightingsData();
  const taxonomyData = useArchetypeTaxonomyData();
  const playersData = useOmnidexPlayers();

  const [mode, setMode] = useState<Mode>("placement");
  const [championName, setChampionName] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const championsPresent = useMemo(() => {
    if (!sightingsData) return [];
    return Array.from(new Set(sightingsData.sightings.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [sightingsData]);

  const clustersForChampion = useMemo(() => {
    if (!taxonomyData || !championName) return [];
    return taxonomyData.clusters.filter((c) => c.championName === championName).sort((a, b) => b.deckCount - a.deckCount);
  }, [taxonomyData, championName]);

  const cluster = clustersForChampion.find((c) => c.id === clusterId) ?? null;
  const clusterDeckIds = useMemo(() => (cluster ? new Set(cluster.deckIds) : null), [cluster]);

  const matches = useMemo(() => {
    if (!sightingsData || !championName) return [];
    let rows = sightingsData.sightings.filter((s) => s.championName === championName);
    if (mode === "archetype") {
      if (!clusterDeckIds) return [];
      rows = rows.filter((s) => clusterDeckIds.has(s.deckId));
    }
    return [...rows].sort((a, b) => b.weightedScore - a.weightedScore);
  }, [sightingsData, championName, mode, clusterDeckIds]);

  const visible = matches.slice(0, visibleCount);
  const championImages = useChampionCardImages(useMemo(() => (championName ? [championName] : []), [championName]));

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  function selectChampion(name: string | null) {
    setChampionName(name);
    setClusterId(null);
    setVisibleCount(PAGE_SIZE);
  }

  function selectMode(next: Mode) {
    setMode(next);
    setVisibleCount(PAGE_SIZE);
  }

  const showResults = championName && (mode === "placement" || clusterId);

  return (
    <div data-component="ImportTopDecks">
      <p className="text-sm text-ctp-subtext1">
        Browse top-performing decks by Champion, ranked by placement — or narrow to one named build.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championName ?? ""}
          aria-label="Champion"
          onChange={(e) => selectChampion(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">Choose a Champion…</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {championName && (
          <>
            <span className="ml-2 text-ctp-subtext0">Scope:</span>
            {(["placement", "archetype"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => selectMode(m)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  mode === m ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {m === "placement" ? "Best placement" : "By archetype"}
              </button>
            ))}
          </>
        )}
      </div>

      {championName && mode === "archetype" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Build:</span>
          <select
            value={clusterId ?? ""}
            aria-label="Build"
            onChange={(e) => {
              setClusterId(e.target.value || null);
              setVisibleCount(PAGE_SIZE);
            }}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            <option value="">Choose a build…</option>
            {clustersForChampion.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.deckCount})
              </option>
            ))}
          </select>
          {clustersForChampion.length === 0 && <span className="text-xs text-ctp-subtext0">No named builds for this Champion yet.</span>}
        </div>
      )}

      {showResults && (
        <>
          <p className="mt-3 text-sm text-ctp-subtext1">
            {matches.length} deck{matches.length === 1 ? "" : "s"} match, ranked by placement
          </p>

          {matches.length === 0 && <InlineState className="mt-2 text-sm">No decks match this filter.</InlineState>}

          <div className="mt-2 space-y-2">
            {visible.map((sighting) => (
              <DeckSightingRow
                key={sighting.deckId}
                sighting={sighting}
                playerName={playerName(sighting.player)}
                championCard={championName ? championImages.get(championName) : undefined}
                added={comparedKeys.has(sighting.deckId)}
                onAdd={() =>
                  onToggle({
                    key: sighting.deckId,
                    label: `${playerName(sighting.player)} @ ${sighting.eventName}`,
                    source: { kind: "sighting", eventId: sighting.eventId, player: sighting.player },
                  })
                }
              />
            ))}
          </div>

          {visibleCount < matches.length && (
            <Button
              variant="secondary"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="mt-4 w-full"
            >
              Load more ({matches.length - visibleCount} remaining)
            </Button>
          )}
        </>
      )}
    </div>
  );
}
