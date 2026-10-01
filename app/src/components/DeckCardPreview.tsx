import { sortDeckCardsByElement, type Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "./CardArtTile";

/** Wrapping, named card art for deck previews and complete sections. */
export default function DeckCardPreview({ lines, cardsByName, compact = false, groupByElement = false, newTab = false }: {
  newTab?: boolean;
  lines: { name: string; quantity?: number }[];
  cardsByName: Map<string, Card>;
  compact?: boolean;
  groupByElement?: boolean;
}) {
  return <ul className={compact ? "grid max-w-72 grid-cols-3 gap-2" : "grid grid-cols-2 gap-3 min-[390px]:grid-cols-3 sm:grid-cols-4"}>
    {(groupByElement ? sortDeckCardsByElement(lines, cardsByName) : lines).map((line) => {
      const card = cardsByName.get(line.name);
      const content = <><CardArtTile card={card} name={line.name} cornerBadge={line.quantity === undefined ? undefined : `${line.quantity}×`} /><span className="mt-1 block break-words text-xs font-medium leading-snug text-ctp-text">{line.name}</span></>;
      return <li key={line.name} className="min-w-0">{card ? <Link target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined} aria-label={newTab ? `${line.name} – opens in a new tab` : undefined} to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue hover:text-ctp-blue">{content}</Link> : <div>{content}</div>}</li>;
    })}
  </ul>;
}
