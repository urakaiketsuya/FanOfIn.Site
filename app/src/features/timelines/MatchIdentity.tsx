import { Link } from "react-router-dom";
import type { BroadcastTimelineMatch, Card } from "@gatcg/shared";
import { championForDeck } from "./champions";
import CardArtTile from "../../components/CardArtTile";

export default function MatchIdentity({ match, champions, linked = false }: { match: BroadcastTimelineMatch; champions?: Card[]; linked?: boolean }) {
  return <div className="grid grid-cols-2 gap-4">
    {match.players.map((player, index) => {
      const card = championForDeck(player.deck, champions);
      const deckLabel = player.deck.split(/\s*[(/—]/)[0].trim();
      const artwork = <CardArtTile card={card} name={card?.name ?? deckLabel} artworkOnly />;
      return <div key={player.id} className="min-w-0">
        {linked && card ? <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{artwork}</Link> : artwork}
        <p className={`mt-2 break-words text-lg font-bold ${index === 0 ? "text-ctp-blue" : "text-ctp-mauve"}`}>{player.name}</p>
        <p className="text-sm text-ctp-subtext1 break-words">{deckLabel}</p>
      </div>;
    })}
  </div>;
}
