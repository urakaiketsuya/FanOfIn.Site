import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import type { GoldfishCardInstance } from "../../lib/goldfishSimulator";

/** Visible zone identity without changing the session's card order or copies. */
export default function GoldfishZoneCards({ title, cards, cardsByName, emptyText }: {
  title: string;
  cards: GoldfishCardInstance[];
  cardsByName: Map<string, Card>;
  emptyText: string;
}) {
  return <section className="mt-4">
    <h3 className="text-base font-semibold text-ctp-text">{title} <span className="tabular-nums text-ctp-subtext0">({cards.length})</span></h3>
    {cards.length === 0 ? <p className="mt-2 text-sm text-ctp-subtext0">{emptyText}</p> : <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((instance) => {
        const card = cardsByName.get(instance.name);
        return <div key={instance.id} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2">
          <CardArtTile card={card} name={instance.name} />
          <p className="mt-2 break-words text-sm font-medium text-ctp-text">{card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center rounded underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{instance.name}<span className="sr-only"> (opens in a new tab)</span></Link> : instance.name}</p>
        </div>;
      })}
    </div>}
  </section>;
}
