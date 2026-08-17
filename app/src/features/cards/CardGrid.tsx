import { Link } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardImage from "../../components/CardImage";

interface CardGridProps {
  cards: Card[];
  /** Which edition's art to show per card — defaults to the first. Set detail pages pass the edition from that set. */
  pickEdition?: (card: Card) => CardEdition | undefined;
}

export default function CardGrid({ cards, pickEdition }: CardGridProps) {
  if (cards.length === 0) {
    return <p className="mt-8 text-ctp-subtext0">No cards match these filters.</p>;
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {cards.map((card) => {
        const edition = pickEdition ? pickEdition(card) : card.editions[0];
        return (
          <Link
            key={card.uuid}
            to={`/cards/${card.slug}`}
            className="group rounded-md transition hover:scale-[1.02]"
          >
            {edition ? (
              <CardImage
                image={edition.image}
                alt={card.name}
                className="w-full rounded-md border border-ctp-surface1 group-hover:border-ctp-blue"
              />
            ) : (
              <div className="flex aspect-[5/7] w-full items-center justify-center rounded-md border border-ctp-surface1 bg-ctp-mantle text-xs text-ctp-subtext0">
                No image
              </div>
            )}
            <p className="mt-1 truncate text-xs text-ctp-subtext1">{card.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
