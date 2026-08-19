import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckSightingsData } from "../topdecks/data";
import { shortHash } from "../../lib/hash";
import type { PopularDeck } from "./useDeckPopularity";

export default function PopularDeckRow({
  deck,
  playerName,
  championCard,
}: {
  deck: PopularDeck;
  playerName: (id: number) => string;
  championCard: Card | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const sightingsData = useDeckSightingsData();

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: deck.main.map((l) => ({ card: l.name, quantity: l.quantity })),
      material: deck.material.map((l) => ({ card: l.name, quantity: l.quantity })),
      sideboard: [],
    }),
    [deck],
  );
  const allNames = useMemo(() => [...deck.main, ...deck.material].map((l) => l.name), [deck]);
  const cardsByName = useCardsByNames(allNames);

  const instances = useMemo(() => {
    if (!sightingsData) return [];
    const deckIdSet = new Set(deck.deckIds);
    return sightingsData.sightings
      .filter((s) => deckIdSet.has(s.deckId))
      .sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity));
  }, [sightingsData, deck.deckIds]);

  return (
    <div className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={deck.championName ?? "Unknown champion"}>
          {championCard?.editions[0] ? (
            <CardImage
              image={championCard.editions[0].image}
              alt={deck.championName ?? ""}
              className="h-14 w-10 shrink-0 rounded object-cover object-top"
            />
          ) : (
            <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
          )}
        </CardHoverPreview>

        <div className="min-w-0 flex-1">
          {deck.championName ? (
            <Link
              to={`/champions/${encodeURIComponent(deck.championName)}`}
              className="font-medium text-ctp-text hover:text-ctp-blue"
            >
              {deck.championName}
            </Link>
          ) : (
            <span className="text-ctp-subtext0">Unknown champion</span>
          )}
          <div className="mt-0.5 text-xs text-ctp-subtext0">
            {deck.playerCount} player{deck.playerCount === 1 ? "" : "s"} · {deck.eventCount} event
            {deck.eventCount === 1 ? "" : "s"}
            {deck.bestPlacement !== null && ` · best finish #${deck.bestPlacement}`} ·{" "}
            {(deck.avgWinRate * 100).toFixed(0)}% avg win rate
            {deck.elements.length > 0 && ` · ${deck.elements.join("/")}`}
            {deck.classes.length > 0 && ` · ${deck.classes.join("/")}`}
          </div>
        </div>
        <Link
          to={`/decks/${shortHash(deck.signature)}`}
          className="shrink-0 rounded-md border border-ctp-blue px-2 py-1.5 text-xs text-ctp-blue hover:bg-ctp-surface0"
        >
          View stats &rarr;
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text"
        >
          {expanded ? "Hide" : "Decklist"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 border-t border-ctp-surface0 pt-2">
          <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={deck.deckIds[0]} />

          <h3 className="mt-4 text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Played by ({instances.length})
          </h3>
          <div className="mt-2">
            <TopDecksList decks={instances} playerName={playerName} />
          </div>
        </div>
      )}
    </div>
  );
}
