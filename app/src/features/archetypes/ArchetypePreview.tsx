import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";

export default function ArchetypePreview({ names, cardImages }: { names: string[]; cardImages: Map<string, Card> }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Named cards">{names.map(name => {
    const card = cardImages.get(name);
    const content = <><CardArtTile card={card} name={name} /><span className="mt-1 block break-words text-xs">{name}</span></>;
    return card ? <Link key={name} to={`/cards/${card.slug}`} className="min-w-0 rounded focus-visible:outline-2">{content}</Link> : <div key={name} className="min-w-0">{content}</div>;
  })}</div>;
}
