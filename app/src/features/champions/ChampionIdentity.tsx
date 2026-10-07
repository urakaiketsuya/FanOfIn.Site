import { useMemo } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import { useCardCatalog } from "../cards/useCardCatalog";

/** Catalog-backed identity, including champions without promotional cutout artwork. */
export default function ChampionIdentity({ championName, fallbackNames }: {
  championName: string;
  fallbackNames: string[];
}) {
  const catalog = useCardCatalog();
  const identityCards = useMemo(() => catalog
    .filter((card) => card.types.includes("CHAMPION") &&
      (card.name === championName || card.name.startsWith(`${championName}, `)))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name)),
  [catalog, championName]);
  const identityNames = identityCards.length > 0
    ? identityCards.map((card) => card.name)
    : fallbackNames.filter((name) => name === championName || name.startsWith(`${championName}, `));
  const identityByName = new Map(identityCards.map((card) => [card.name, card]));

  return (
    <section aria-label={`${championName} card portraits`} className="identity-surface mb-4 mt-4 rounded-3xl border border-ctp-surface1 p-4">
      <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {(identityNames.length > 0 ? identityNames : [championName]).map((cardName) => {
          const card = identityByName.get(cardName);
          const content = <><CardArtTile card={card} name={cardName} /><span className="mt-2 block break-words text-sm font-medium text-ctp-text">{cardName}</span>{card?.level != null && <span className="mt-1 block text-xs text-ctp-subtext0">Level {card.level}</span>}</>;
          return card?.slug ? (
            <Link key={cardName} to={`/cards/${card.slug}`} className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue hover:text-ctp-blue">
              {content}
            </Link>
          ) : <div key={cardName} className="min-w-0">{content}</div>;
        })}
      </div>
    </section>
  );
}
