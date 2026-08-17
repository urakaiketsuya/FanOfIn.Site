import { useMemo, useState } from "react";
import { useDeckSightingsData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardCombination } from "../cards/useCardCombination";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import type { ComparedDeck } from "./types";

const PAGE_SIZE = 20;

export default function DeckSearchByCards({
  comparedKeys,
  onToggle,
}: {
  comparedKeys: Set<string>;
  onToggle: (deck: ComparedDeck) => void;
}) {
  const cards = useCardCatalog();
  const cardNames = useMemo(() => cards.map((c) => c.name).sort(), [cards]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardInput, setCardInput] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();
  const combination = useCardCombination(selectedCards);

  const deckIdSet = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);
  const matches = useMemo(() => {
    if (!sightingsData) return [];
    return sightingsData.sightings
      .filter((s) => deckIdSet.has(s.deckId))
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [sightingsData, deckIdSet]);

  const visible = matches.slice(0, visibleCount);
  const championImages = useChampionCardImages(
    Array.from(new Set(visible.map((s) => s.championName).filter((n): n is string => n !== null))),
  );

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || selectedCards.includes(name)) return;
    setSelectedCards((prev) => [...prev, name]);
    setCardInput("");
    setVisibleCount(PAGE_SIZE);
  }

  function removeCard(name: string) {
    setSelectedCards((prev) => prev.filter((n) => n !== name));
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <p className="text-sm text-ctp-subtext1">Find decks containing every card you add here.</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {selectedCards.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => removeCard(name)}
            className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
          >
            {name}
            <span aria-hidden="true">&times;</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        list="deck-search-card-options"
        value={cardInput}
        onChange={(e) => {
          setCardInput(e.target.value);
          if (cardNameSet.has(e.target.value)) addCard(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput);
        }}
        placeholder="Type a card name…"
        className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />
      <datalist id="deck-search-card-options">
        {cardNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {selectedCards.length > 0 && (
        <>
          <p className="mt-3 text-sm text-ctp-subtext1">
            {combination.deckCount === undefined ? "Loading deck data…" : `${matches.length} decks match`}
          </p>

          <div className="mt-2 space-y-2">
            {visible.map((sighting) => (
              <DeckSightingRow
                key={sighting.deckId}
                sighting={sighting}
                playerName={playerName(sighting.player)}
                championCard={sighting.championName ? championImages.get(sighting.championName) : undefined}
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
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="mt-4 w-full rounded-md border border-ctp-surface1 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
            >
              Load more ({matches.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
