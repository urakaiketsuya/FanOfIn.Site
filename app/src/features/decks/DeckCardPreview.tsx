import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { primaryAlternateFace } from "../../lib/cardFaces";

function stableRank(seed: string, name: string): number {
  let hash = 2166136261;
  for (const char of `${seed}:${name}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Champion art followed by a stable sample of two real main-deck cards. */
export default function DeckCardPreview({ names, cardsByName, championCard, seed, loading = false }: { names: string[]; cardsByName: Map<string, Card>; championCard?: Card; seed: string; loading?: boolean }) {
  const sampledCards = [...new Set(names)]
    .filter((name) => name !== championCard?.name)
    .map((name) => cardsByName.get(name))
    .filter((card): card is Card => !!card?.editions[0]?.image)
    .sort((a, b) => stableRank(seed, a.name) - stableRank(seed, b.name))
    .slice(0, 2);
  const cards = [championCard?.editions[0]?.image ? championCard : undefined, ...sampledCards];

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Sample cards from this deck">
      {Array.from({ length: 3 }, (_, index) => {
        const card = cards[index];
        const reverseFace = primaryAlternateFace(card);
        return card ? (
          <div key={card.name} className="min-w-0">
            <CardHoverPreview artOnly image={card.editions[0].image} backImage={reverseFace?.edition.image} backAlt={reverseFace?.name} alt={card.name}>
              <CardImage image={card.editions[0].image} alt={card.name} className="aspect-[5/7] w-full rounded-md object-cover object-top" />
            </CardHoverPreview>
          </div>
        ) : (
          <div key={`placeholder-${index}`} className={`flex aspect-[5/7] items-center justify-center rounded-md bg-ctp-surface0 text-center text-xs text-ctp-subtext0 ${loading ? "animate-pulse" : ""}`}>
            {!loading && index === 0 ? "Champion art unavailable" : null}
          </div>
        );
      })}
    </div>
  );
}
