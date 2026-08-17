import { useMemo, useState } from "react";
import { useOmnidexIndex, useOmnidexPlayers } from "../tournaments/data";
import EventRow from "../tournaments/EventRow";
import type { ComparedDeck } from "./types";

export default function ImportByPlayer({
  comparedKeys,
  onToggle,
}: {
  comparedKeys: Set<string>;
  onToggle: (deck: ComparedDeck) => void;
}) {
  const playersData = useOmnidexPlayers();
  const index = useOmnidexIndex();
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const matchingPlayers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle || !playersData) return [];
    return playersData.players.filter((p) => p.username.toLowerCase().includes(needle)).slice(0, 20);
  }, [playersData, search]);

  const selectedPlayer = playersData?.players.find((p) => p.id === selectedPlayerId);

  const events = useMemo(() => {
    if (!selectedPlayer || !index) return [];
    return index.events
      .filter((e) => selectedPlayer.eventIds.includes(e.id) && e.decklists)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedPlayer, index]);

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

          {events.length === 0 && <p className="mt-2 text-sm text-ctp-subtext1">No public decklists found.</p>}

          <div className="mt-2 space-y-2">
            {events.map((event) => {
              const key = `${event.id}:${selectedPlayer.id}`;
              const added = comparedKeys.has(key);
              return (
                <div key={event.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <EventRow event={event} />
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
