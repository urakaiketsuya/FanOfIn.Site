import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { useCardsByNames } from "./useCardsByNames";
import DecklistView from "./DecklistView";
import { useSimilarityData } from "../archetypes/data";
import { usePlayerNameById } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";
import Section from "../../components/ui/Section";
import { canonicalSignature } from "../popular/useDeckPopularity";
import { shortHash } from "../../lib/hash";
import { eventDeckSearchParams, nextEventDeckSearchIndex, resolveEventDeckSelection } from "./eventDeckSelection";

export default function DecklistsSection({
  eventId,
  decklists,
  players,
}: {
  eventId: number;
  decklists: OmnidexDecklistEntry[];
  players: OmnidexPlayer[];
}) {
  const rankedDecklists = useMemo(() => [...decklists].sort((a, b) => {
    const placement = (playerId: number) => players.find((player) => player.id === playerId)?.finalPlacement ?? Infinity;
    return placement(a.player) - placement(b.player);
  }), [decklists, players]);
  const [searchParams, setSearchParams] = useSearchParams();
  const selection = useMemo(
    () => resolveEventDeckSelection(eventId, rankedDecklists, searchParams.get("player")),
    [eventId, rankedDecklists, searchParams],
  );
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const selected = selection?.deck;

  function selectPlayer(player: number) {
    setSearchParams((current) => eventDeckSearchParams(current, player));
    setSearch("");
    setSearchOpen(false);
    setActiveSearchIndex(-1);
  }

  const allNames = useMemo(
    () =>
      selected
        ? [...selected.decklist.main, ...selected.decklist.material, ...selected.decklist.sideboard].map((l) => l.card)
        : [],
    [selected],
  );
  const cardsByName = useCardsByNames(allNames);

  const similarityData = useSimilarityData();
  const fallbackPlayerName = usePlayerNameById();
  const similarDecks = selection ? similarityData?.decks.find((d) => d.deckId === selection.deckId) : undefined;

  // Same signature/hash scheme every other deck-page link uses (PopularDeckRow, DeckDetail's own
  // "similar decks", Compare's paste-in decks) — computed client-side from this exact decklist
  // rather than looked up, so it resolves even before any async popularity data has loaded.
  const deckPageHash = useMemo(() => {
    if (!selected) return null;
    const main = selected.decklist.main.map((line) => ({ name: line.card, quantity: line.quantity }));
    const material = selected.decklist.material.map((line) => ({ name: line.card, quantity: line.quantity }));
    return shortHash(canonicalSignature(main, material));
  }, [selected]);

  const playerName = useMemo(() => {
    const localUsernameById = new Map(players.map((player) => [player.id, player.username]));
    return (id: number) => localUsernameById.get(id) ?? fallbackPlayerName(id);
  }, [players, fallbackPlayerName]);

  const searchMatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return rankedDecklists.filter((d) => playerName(d.player).toLowerCase().includes(needle)).slice(0, 8);
  }, [rankedDecklists, search, playerName]);

  useEffect(() => setActiveSearchIndex(-1), [search]);

  if (decklists.length === 0) return null;

  return (
    <Section
      data-component="DecklistsSection"
      title={`Decklists (${decklists.length})`}
      heading="compact"
      actions={
        selection && (
          <>
            <PlayerLink id={selection.player} username={playerName(selection.player)} className="text-xs text-ctp-blue hover:underline" />
            {deckPageHash && <Link to={`/decks/${deckPageHash}`} className="text-xs text-ctp-blue hover:underline">Open deck page →</Link>}
          </>
        )
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
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSearchOpen(true);
              setActiveSearchIndex((current) => nextEventDeckSearchIndex(current, searchMatches.length, event.key === "ArrowDown" ? 1 : -1));
            } else if (event.key === "Enter" && activeSearchIndex >= 0) {
              event.preventDefault();
              const match = searchMatches[activeSearchIndex];
              if (match) selectPlayer(match.player);
            } else if (event.key === "Escape") {
              setSearchOpen(false);
              setActiveSearchIndex(-1);
            }
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
          placeholder="Search players…"
          role="combobox"
          aria-expanded={searchOpen && search.trim() !== ""}
          aria-controls="event-deck-player-options"
          aria-activedescendant={activeSearchIndex >= 0 ? `event-deck-player-${searchMatches[activeSearchIndex]?.player}` : undefined}
          className="w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        {searchOpen && search.trim() !== "" && (
          <div id="event-deck-player-options" role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ctp-surface1 bg-ctp-mantle shadow-lg">
            {searchMatches.length > 0 ? (
              searchMatches.map((d, index) => (
                <button
                  key={d.player}
                  id={`event-deck-player-${d.player}`}
                  role="option"
                  aria-selected={d.player === selection?.player}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveSearchIndex(index)}
                  onClick={() => selectPlayer(d.player)}
                  className={`block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-ctp-surface0 ${
                    d.player === selection?.player || index === activeSearchIndex ? "bg-ctp-surface0 text-ctp-blue" : "text-ctp-text"
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
          <p className="sr-only" aria-live="polite">Showing deck for {playerName(selected.player)}</p>
          <DecklistView decklist={selected.decklist} cardsByName={cardsByName} deckId={selection?.deckId} showThumbnails />
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
