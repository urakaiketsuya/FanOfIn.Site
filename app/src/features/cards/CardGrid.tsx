import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import { InlineState } from "../../components/ui/ContentState";
import { primaryAlternateFace } from "../../lib/cardFaces";

interface CardGridProps {
  cards: Card[];
  /** Which edition's art to show per card – defaults to the first. Set detail pages pass the edition from that set. */
  pickEdition?: (card: Card) => CardEdition | undefined;
}

export default function CardGrid({ cards, pickEdition }: CardGridProps) {
  if (cards.length === 0) {
    return <InlineState data-component="CardGrid" className="mt-8">No cards match these filters.</InlineState>;
  }

  return (
    <div data-component="CardGrid" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {cards.map((card) => {
        const edition = pickEdition ? pickEdition(card) : card.editions[0];
        return <CardGridItem key={card.uuid} card={card} edition={edition} />;
      })}
    </div>
  );
}

function CardGridItem({ card, edition }: { card: Card; edition: CardEdition | undefined }) {
  const [showBack, setShowBack] = useState(false);
  const reverseFace = primaryAlternateFace(card, edition);
  useEffect(() => setShowBack(false), [edition?.uuid]);
  const faceName = showBack ? reverseFace?.name ?? `${card.name} reverse face` : card.name;
  const faceEdition = showBack ? reverseFace?.edition : edition;

  return (
    <article className="group min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 transition-colors hover:border-ctp-blue">
      <div className="relative">
        <Link to={`/cards/${card.slug}`} aria-label={`Open ${faceName}`} className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/50">
          <CardArtTile card={faceEdition ? { ...card, editions: [faceEdition] } : undefined} name={faceName} />
        </Link>
        {reverseFace && (
          <button
            type="button"
            onClick={() => setShowBack((value) => !value)}
            aria-label={`Show ${showBack ? "front" : "reverse"} face of ${card.name}`}
            aria-pressed={showBack}
            className="absolute bottom-2 right-2 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-ctp-surface1 bg-ctp-base/95 px-2 text-[10px] font-semibold text-ctp-blue shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/50"
          >
            {showBack ? "Front" : "Flip"}
          </button>
        )}
      </div>
      <Link to={`/cards/${card.slug}`} className="mt-1 flex min-h-12 items-center break-words rounded px-1 text-sm font-medium text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{faceName}</Link>
    </article>
  );
}
