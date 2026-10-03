import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { useCardsByNames } from "../events/useCardsByNames";
import { shortHash } from "../../lib/hash";
import { championNameToSlug } from "../../lib/championSlug";
import type { PopularDeck } from "./useDeckPopularity";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function PopularDeckRow({
  deck,
  championCard,
  latestEventName,
}: {
  deck: PopularDeck;
  playerName: (id: number) => string;
  championCard: Card | undefined;
  latestEventName?: string;
}) {

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
    championName: deck.championName, sideboardCount: null,
    source: { kind: "event", label: "Tournament build" },
    metadata: <>
      <p>{deck.playerCount} player{deck.playerCount === 1 ? "" : "s"}{deck.bestPlacement !== null && ` · Best #${deck.bestPlacement}`}</p>
    </>,
    status: <details className="group text-xs text-ctp-subtext0">
      <summary className={`${deckPreviewActionClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Build details<DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <span>{deck.sightingCount} appearance{deck.sightingCount === 1 ? "" : "s"}</span>
        {deck.sightingCount > 1 && <span>{(deck.avgWinRate * 100).toFixed(0)}% win rate</span>}
        {[...deck.elements, ...deck.classes].map(label => <span key={label} className="capitalize">{label.toLowerCase()}</span>)}
        {deck.championName && <Link to={`/champions/${championNameToSlug(deck.championName)}`} className={`${deckPreviewActionClass} text-ctp-blue`}>{deck.championName}</Link>}
        {deck.lastEventId && latestEventName && <Link to={`/events/${deck.lastEventId}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Latest event: {latestEventName}</Link>}
      </div>
    </details>,
  }} view={{ to: `/decks/${shortHash(deck.signature)}` }} />;
}
