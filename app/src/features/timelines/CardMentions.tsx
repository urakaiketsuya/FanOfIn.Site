import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";

export default function CardMentions({ names, cardsByName }: { names: string[]; cardsByName: Map<string, Card> }) {
  return <div data-component="CardMentions" className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3 max-w-2xl">
    {[...new Set(names)].map(name => {
      const card = cardsByName.get(name);
      const content = <><CardArtTile card={card} name={name} /><span className="mt-1 block text-xs font-medium leading-snug">{name}</span></>;
      return card ? <Link key={name} to={`/cards/${card.slug}`} className="rounded text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue hover:text-ctp-blue">{content}</Link> : <div key={name} className="text-ctp-subtext1">{content}</div>;
    })}
  </div>;
}
