import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";

/** Shared card-first presentation for package pools and exact tested variants. */
export default function PackageCardGrid({ names, cardsByName }: {
  names: readonly string[];
  cardsByName: ReadonlyMap<string, Card>;
}) {
  return <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
    {names.map((name) => {
      const card = cardsByName.get(name);
      const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-sm">{name}</span></>;
      return <li key={name} className="min-w-0">{card
        ? <Link to={`/cards/${card.slug}`} className="block min-h-12 rounded-lg p-1 hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-teal">{content}</Link>
        : <div className="p-1">{content}</div>}
      </li>;
    })}
  </ul>;
}
