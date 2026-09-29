import DeckPreviewCard from "../../components/DeckPreviewCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { DeckFormat, OmnidexDecklistEntry, OmnidexPlayer } from "@gatcg/shared";
import { useCardsByNames } from "./useCardsByNames";
import DecklistView from "./DecklistView";
import { useSimilarityData } from "../archetypes/data";
import { usePlayerNameById } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";
import Section from "../../components/ui/Section";
import { canonicalSignature } from "../popular/useDeckPopularity";
import { shortHash } from "../../lib/hash";
import { findDeckChampionName } from "../../lib/ttsExport";
import { eventDeckSearchParams, nextEventDeckSearchIndex, resolveEventDeckSelection } from "./eventDeckSelection";

function deckCardNames(deck: OmnidexDecklistEntry): string[] {
  return [...deck.decklist.main, ...deck.decklist.material, ...deck.decklist.sideboard].map((line) => line.card);
}

export default function DecklistsSection({
  eventId,
  format,
  decklists,
  players,
}: {
  eventId: number;
  format?: DeckFormat;
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
  const [visibleDeckCount, setVisibleDeckCount] = useState(24);
  const [championFilter, setChampionFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const selected = selection?.deck;
  const browsingAll = searchParams.get("browse") === "all";

  function selectPlayer(player: number) {
    setSearchParams((current) => eventDeckSearchParams(current, player));
    setSearch("");
    setSearchOpen(false);
    setActiveSearchIndex(-1);
  }

  const allNames = useMemo(
    () =>
      selected
        ? deckCardNames(selected)
        : [],
    [selected],
  );
  const cardsByName = useCardsByNames(allNames);
  const eventMaterialNames = useMemo(() => Array.from(new Set(rankedDecklists.flatMap((deck) => deck.decklist.material.map((line) => line.card)))), [rankedDecklists]);
  const eventCardsByName = useCardsByNames(eventMaterialNames);

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
  const championByPlayer = useMemo(() => new Map(rankedDecklists.map((deck) => [deck.player, findDeckChampionName(deck.decklist.material, eventCardsByName)?.split(",")[0].trim() ?? "Unknown Champion"])), [rankedDecklists, eventCardsByName]);
  const champions = useMemo(() => Array.from(new Set(championByPlayer.values())).sort(), [championByPlayer]);
  const deckSearchMatches = useCallback((deck: OmnidexDecklistEntry, needle: string) => playerName(deck.player).toLowerCase().includes(needle) || deckCardNames(deck).some((name) => name.toLowerCase().includes(needle)), [playerName]);
  const matchingCardNames = useCallback((deck: OmnidexDecklistEntry, needle: string) => deckCardNames(deck).filter((name) => name.toLowerCase().includes(needle)), []);
  const matchesFilters = useCallback((deck: OmnidexDecklistEntry, needle: string) => (!needle || deckSearchMatches(deck, needle)) && (!championFilter || championByPlayer.get(deck.player) === championFilter), [championByPlayer, championFilter, deckSearchMatches]);

  const searchMatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return rankedDecklists.filter((deck) => matchesFilters(deck, needle)).slice(0, 8);
  }, [rankedDecklists, search, matchesFilters]);
  const browsedDecklists = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rankedDecklists.filter((deck) => matchesFilters(deck, needle));
  }, [rankedDecklists, search, matchesFilters]);

  useEffect(() => setActiveSearchIndex(-1), [search]);
  useEffect(() => setVisibleDeckCount(24), [search, championFilter, eventId]);

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
          aria-label="Search decks by player or card"
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
          placeholder="Search players or cards…"
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
                  <span className="block">{playerName(d.player)}</span>
                  {matchingCardNames(d, search.trim().toLowerCase()).length > 0 && <span className="block truncate text-xs text-ctp-subtext0">Has {matchingCardNames(d, search.trim().toLowerCase()).slice(0, 2).join(", ")}</span>}
                </button>
              ))
            ) : (
              <p className="px-3 py-1.5 text-sm text-ctp-subtext0">No decks match &ldquo;{search.trim()}&rdquo;.</p>
            )}
          </div>
        )}
      </div>

      <label className="mt-2 block max-w-sm text-xs text-ctp-subtext1">Champion<select aria-label="Filter decks by Champion" value={championFilter} onChange={(event) => { setChampionFilter(event.target.value); setSearchParams((current) => { const next = new URLSearchParams(current); next.set("browse", "all"); return next; }); }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text"><option value="">All Champions</option>{champions.map((champion) => <option key={champion} value={champion}>{champion}</option>)}</select></label>

      {browsingAll && <div className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-base/40 p-2">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <p className="text-sm font-medium text-ctp-text">{browsedDecklists.length} deck{browsedDecklists.length === 1 ? "" : "s"}{search.trim() ? " match your search" : " to browse"}</p>
          <button type="button" onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("browse"); return next; })} className="min-h-12 rounded-lg px-3 text-xs text-ctp-blue">Show selected deck</button>
        </div>
        <div className="grid items-start gap-3 md:grid-cols-2" aria-label="Event decklists">
          {browsedDecklists.slice(0, visibleDeckCount).map((deck) => {
            const placement = players.find(player => player.id === deck.player)?.finalPlacement;
            const matchedCards = search.trim() ? matchingCardNames(deck, search.trim().toLowerCase()) : [];
            return <DeckPreviewCard key={deck.player} cardsByName={eventCardsByName} model={{
              id: `${eventId}:${deck.player}`, title: `${playerName(deck.player)}'s deck`, decklist: deck.decklist, format,
              championName: findDeckChampionName(deck.decklist.material, eventCardsByName),
              source: { kind: "event", label: "Event deck" },
              metadata: <>
                <p>{placement ? `#${placement} · ` : ""}{playerName(deck.player)}</p>
                {matchedCards.length > 0 && <p className="mt-1 text-ctp-mauve">Has {matchedCards.slice(0, 3).join(" · ")}</p>}
              </>,
            }} view={{ to: `?${eventDeckSearchParams(searchParams, deck.player).toString()}` }} />;
          })}
        </div>
        {browsedDecklists.length > visibleDeckCount && <button type="button" onClick={() => setVisibleDeckCount(count => count + 24)} className="mt-3 min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Load more decks</button>}
        {browsedDecklists.length === 0 && <p className="p-4 text-sm text-ctp-subtext0">No decks match this search.</p>}
      </div>}

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
