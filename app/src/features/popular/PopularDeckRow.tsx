import { formatUsd } from "../../lib/format";
import { useDeckArchetypeLabel } from "../decks/useDeckArchetypeLabel";
import { useMemo } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { useCardsByNames } from "../events/useCardsByNames";
import { shortHash } from "../../lib/hash";
import type { PopularDeck } from "./useDeckPopularity";
import DeckPreviewCard from "../../components/DeckPreviewCard";

export default function PopularDeckRow({
  deck,
  championCard,
  price,
}: {
  deck: PopularDeck;
  championCard: Card | undefined;
  price?: number | null;
}) {

  const archetypeLabel = useDeckArchetypeLabel(deck.deckIds);
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

  return <DeckPreviewCard presentation="cover" cardsByName={cardsByName} championCard={championCard} model={{
    id: shortHash(deck.signature), title: `${deck.championName ?? "Unknown Champion"}`, decklist,
    archetypeLabel,
    championName: deck.championName, sideboardCount: null,
    source: { kind: "event", label: "Tournament build" },
    metadata: <>
      <p className="font-semibold text-ctp-text">Played by {deck.playerCount} player{deck.playerCount === 1 ? "" : "s"}</p>
      {deck.bestPlacement !== null && <p>Best finish #{deck.bestPlacement}</p>}
      {price !== undefined && <p>{price === null ? "Price unavailable" : `Estimated price ${formatUsd(price)}`}</p>}
    </>,
  }} view={{ to: `/decks/${shortHash(deck.signature)}` }} />;
}
