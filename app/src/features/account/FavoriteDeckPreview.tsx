import DeckPreviewListActions from "../../components/DeckPreviewListActions";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { OfficialProductDeckFavorite, TournamentDeckFavorite } from "@gatcg/shared";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import DeckCardPreview from "../../components/DeckCardPreview";
import { useCardsByNames } from "../events/useCardsByNames";

/** Favorites display the frozen snapshot, including its own sideboard. */
export default function FavoriteDeckPreview({ deck, onRemove }: {
  deck: OfficialProductDeckFavorite | TournamentDeckFavorite;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const official = "productDeckId" in deck;
  const id = official ? deck.productDeckId : deck.deckHash;
  const cards = useCardsByNames([...deck.decklist.material, ...deck.decklist.main, ...deck.decklist.sideboard].map(line => line.card));
  return <DeckPreviewCard cardsByName={cards} model={{
    id, title: deck.title, decklist: deck.decklist, championName: deck.championName,
    format: official ? deck.format : undefined,
    source: { kind: official ? "official" : "event", label: official ? "Official product · pinned" : "Tournament favorite" },
    metadata: !official && <>{deck.sourcePlayerName}{deck.sourceEventName && ` · ${deck.sourceEventName}`}</>,
    actions: <>
      {!official && <Link to={`/decks/${deck.deckHash}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Open deck page</Link>}
      {official && <Link to={`/card-locations?deck=${encodeURIComponent(deck.locationId)}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Locate cards</Link>}
      <button type="button" onClick={onRemove} className={`${deckPreviewActionClass} text-ctp-red`}>{official ? "Unpin" : "Remove favorite"}</button>
      <DeckPreviewListActions decklist={deck.decklist} title={deck.title} format={official ? deck.format : undefined} />
    </>,
  }} view={{ expanded, onToggle: () => setExpanded(value => !value), content: <div className="grid gap-4">{(["material", "main", "sideboard"] as const).map(section => <section key={section}><h3 className="mb-2 text-sm font-semibold capitalize">{section}</h3>{deck.decklist[section].length ? <DeckCardPreview groupByElement={section === "main"} cardsByName={cards} lines={deck.decklist[section].map(line => ({ name: line.card, quantity: line.quantity }))} /> : <p className="text-xs text-ctp-subtext0">No cards</p>}</section>)}</div> }} />;
}
