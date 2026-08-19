import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { useCardsByNames } from "./useCardsByNames";
import DecklistView from "./DecklistView";
import { useSimilarityData } from "../archetypes/data";
import { useOmnidexPlayers } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";

export default function DecklistsSection({
  eventId,
  decklists,
  players,
  initialPlayer,
}: {
  eventId: number;
  decklists: OmnidexDecklistEntry[];
  players: OmnidexPlayer[];
  initialPlayer?: number;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer ?? decklists[0]?.player);
  const selected = decklists.find((d) => d.player === selectedPlayer) ?? decklists[0];

  const allNames = useMemo(
    () =>
      selected
        ? [...selected.decklist.main, ...selected.decklist.material, ...selected.decklist.sideboard].map((l) => l.card)
        : [],
    [selected],
  );
  const cardsByName = useCardsByNames(allNames);

  const similarityData = useSimilarityData();
  const allPlayersData = useOmnidexPlayers();
  const similarDecks = selected ? similarityData?.decks.find((d) => d.deckId === `${eventId}:${selected.player}`) : undefined;

  function playerName(id: number): string {
    return players.find((p) => p.id === id)?.username ?? allPlayersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (decklists.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Decklists ({decklists.length})</h2>
        <div className="flex items-center gap-2">
          {selected && (
            <PlayerLink id={selected.player} username={playerName(selected.player)} className="text-xs text-ctp-blue hover:underline" />
          )}
          <select
            value={selected?.player}
            onChange={(e) => setSelectedPlayer(Number(e.target.value))}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            {decklists.map((d) => (
              <option key={d.player} value={d.player}>
                {playerName(d.player)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selected && (
        <div className="mt-3">
          <DecklistView decklist={selected.decklist} cardsByName={cardsByName} deckId={`${eventId}:${selected.player}`} />
        </div>
      )}
      {similarDecks && similarDecks.topMatches.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Similar decks</h3>
          <div className="mt-1 space-y-1 text-sm">
            {similarDecks.topMatches.map((m, i) => (
              <div key={i} className="text-ctp-subtext1">
                <PlayerLink id={m.player} username={playerName(m.player)} className="text-ctp-text hover:text-ctp-blue" />
                {"'s deck at "}
                <Link to={`/events/${m.eventId}`} className="text-ctp-blue hover:underline">
                  {m.eventName}
                </Link>{" "}
                <span className="text-ctp-subtext0">({(m.score * 100).toFixed(0)}% similar)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
