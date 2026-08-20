import { useMemo, useState } from "react";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import EventRow from "../tournaments/EventRow";
import type { ComparedDeck } from "./types";

type SortMode = "date" | "best";

export default function ImportByPlayer({
  comparedKeys,
  onToggle,
}: {
  comparedKeys: Set<string>;
  onToggle: (deck: ComparedDeck) => void;
}) {
  const playersData = useOmnidexPlayers();
  const index = useOmnidexIndex();
  const popularityIndexData = useDeckPopularityIndexData();
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date");

  const matchingPlayers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle || !playersData) return [];
    return playersData.players.filter((p) => p.username.toLowerCase().includes(needle)).slice(0, 20);
  }, [playersData, search]);

  const selectedPlayer = playersData?.players.find((p) => p.id === selectedPlayerId);

  // deckId -> {weightedScore, winRate} for this player's own sightings only, keyed the same way
  // ComparedDeck.key already is (`${eventId}:${player}`) — lets the event list sort by "best
  // performing deck" (the same tier-weighted placement score Top Decks' "best" sort uses) and show
  // a quick win-rate badge, without pulling in the much larger full deck-sightings dataset.
  const scoreByDeckId = useMemo(() => {
    const map = new Map<string, { weightedScore: number; winRate: number }>();
    if (!selectedPlayer || !popularityIndexData) return map;
    for (const entry of popularityIndexData.entries) {
      if (entry.player === selectedPlayer.id) map.set(entry.deckId, { weightedScore: entry.weightedScore, winRate: entry.winRate });
    }
    return map;
  }, [popularityIndexData, selectedPlayer]);

  const events = useMemo(() => {
    if (!selectedPlayer || !index) return [];
    const needle = eventSearch.trim().toLowerCase();
    const rows = index.events.filter(
      (e) => selectedPlayer.eventIds.includes(e.id) && e.decklists && (!needle || e.name.toLowerCase().includes(needle)),
    );
    if (sortMode === "best") {
      return [...rows].sort((a, b) => {
        const scoreA = scoreByDeckId.get(`${a.id}:${selectedPlayer.id}`)?.weightedScore ?? -Infinity;
        const scoreB = scoreByDeckId.get(`${b.id}:${selectedPlayer.id}`)?.weightedScore ?? -Infinity;
        return scoreB - scoreA;
      });
    }
    return [...rows].sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedPlayer, index, eventSearch, sortMode, scoreByDeckId]);

  return (
    <div>
      <p className="text-sm text-ctp-subtext1">Find a player, then pick one of their public decklists to compare.</p>

      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedPlayerId(null);
        }}
        placeholder="Search by username…"
        className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      {!selectedPlayer && matchingPlayers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {matchingPlayers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlayerId(p.id)}
              className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-text hover:border-ctp-blue hover:text-ctp-blue"
            >
              {p.username}
            </button>
          ))}
        </div>
      )}

      {selectedPlayer && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ctp-text">{selectedPlayer.username}</span>
            <button
              type="button"
              onClick={() => setSelectedPlayerId(null)}
              className="text-xs text-ctp-subtext0 hover:text-ctp-text"
            >
              Change
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Search by event name…"
              className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ctp-subtext0">Sort by:</span>
            {(["date", "best"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`rounded-md border px-2 py-1 ${
                  sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {mode === "date" ? "Most recent" : "Best performing"}
              </button>
            ))}
          </div>

          {events.length === 0 && <p className="mt-2 text-sm text-ctp-subtext1">No public decklists match.</p>}

          <div className="mt-2 space-y-2">
            {events.map((event) => {
              const key = `${event.id}:${selectedPlayer.id}`;
              const added = comparedKeys.has(key);
              const score = scoreByDeckId.get(key);
              return (
                <div key={event.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <EventRow event={event} />
                    {score && <p className="mt-0.5 text-xs text-ctp-subtext0">{(score.winRate * 100).toFixed(0)}% win rate</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onToggle({
                        key,
                        label: `${selectedPlayer.username} @ ${event.name}`,
                        source: { kind: "sighting", eventId: event.id, player: selectedPlayer.id },
                      })
                    }
                    className={`shrink-0 rounded-md border px-2 py-1.5 text-xs ${
                      added ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                    }`}
                  >
                    {added ? "− Remove" : "+ Compare"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
