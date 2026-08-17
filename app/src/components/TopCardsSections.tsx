import { Link } from "react-router-dom";
import type { Card, PlayerTopCard, TopCardsBySection } from "@gatcg/shared";
import CardImage from "./CardImage";
import CardHoverPreview from "./CardHoverPreview";

function CardRow({ card: topCard, resolved }: { card: PlayerTopCard; resolved: Card | undefined }) {
  const inner = (
    <>
      {resolved?.editions[0] ? (
        <CardImage image={resolved.editions[0].image} alt={topCard.name} className="h-14 w-10 shrink-0 rounded object-cover object-top" />
      ) : (
        <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
      )}
      <span className="flex-1 text-ctp-text">{topCard.name}</span>
      <span className="text-ctp-subtext0">{topCard.deckCount} decks</span>
    </>
  );
  return (
    <CardHoverPreview image={resolved?.editions[0]?.image} alt={topCard.name}>
      {topCard.slug ? (
        <Link to={`/cards/${topCard.slug}`} className="flex items-center gap-2 text-sm hover:text-ctp-blue">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-2 text-sm">{inner}</div>
      )}
    </CardHoverPreview>
  );
}

/** Card usage split by deck section — main/material/sideboard are structurally different card pools, so lumping them together buries a defining material-deck piece among 40-card mainboard staples. */
export default function TopCardsSections({ topCards, cardImages }: { topCards: TopCardsBySection; cardImages: Map<string, Card> }) {
  const sections = [
    { label: "Main", cards: topCards.main },
    { label: "Material", cards: topCards.material },
    { label: "Sideboard", cards: topCards.sideboard },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {sections.map(({ label, cards }) =>
        cards.length > 0 ? (
          <div key={label}>
            <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{label}</h3>
            <div className="mt-2 space-y-2">
              {cards.map((c) => (
                <CardRow key={c.name} card={c} resolved={cardImages.get(c.name)} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
