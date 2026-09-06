import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { useCardsByNames } from "./useCardsByNames";
import DecklistView from "./DecklistView";
import { useSimilarityData } from "../archetypes/data";
import { useOmnidexPlayers } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";
import Section from "../../components/ui/Section";

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
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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

  const searchMatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return decklists.filter((d) => playerName(d.player).toLowerCase().includes(needle)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decklists, search, players, allPlayersData]);

  if (decklists.length === 0) return null;

  return (
    <Section
      data-component="DecklistsSection"
      title={`Decklists (${decklists.length})`}
      heading="compact"
      actions={
        selected && <PlayerLink id={selected.player} username={playerName(selected.player)} className="text-xs text-ctp-blue hover:underline" />
      }
    >
      <div className="relative mt-1 max-w-sm">
        <input
          type="text"
          aria-label="Search players"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
          placeholder="Search players…"
          className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        {searchOpen && search.trim() !== "" && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ctp-surface1 bg-ctp-mantle shadow-lg">
            {searchMatches.length > 0 ? (
              searchMatches.map((d) => (
                <button
                  key={d.player}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedPlayer(d.player);
                    setSearch("");
                    setSearchOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-ctp-surface0 ${
                    d.player === selectedPlayer ? "text-ctp-blue" : "text-ctp-text"
                  }`}
                >
                  {playerName(d.player)}
                </button>
              ))
            ) : (
              <p className="px-3 py-1.5 text-sm text-ctp-subtext0">No players match &ldquo;{search.trim()}&rdquo;.</p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-3">
          <DecklistView decklist={selected.decklist} cardsByName={cardsByName} deckId={`${eventId}:${selected.player}`} showThumbnails />
        </div>
      )}
      {similarDecks && similarDecks.topMatches.length > 0 && (
        <Section className="mt-4" heading="dense" title="Similar decks">
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
        </Section>
      )}
    </Section>
  );
}
