import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import Section from "../../components/ui/Section";
import type { ArchetypeVariant } from "./useArchetypeVariants";

export function variantToDecklist(variant: ArchetypeVariant): OmnidexDecklist {
  const toLines = (cards: Map<string, number>) => Array.from(cards.entries()).map(([card, quantity]) => ({ card, quantity }));
  return { main: toLines(variant.main), material: toLines(variant.material), sideboard: toLines(variant.sideboard) };
}

export function DefiningCardList({ cards, cardImages, tone = "default" }: {
  cards: { name: string; prevalence: number }[];
  cardImages: Map<string, Card>;
  tone?: "default" | "material";
}) {
  const classes = tone === "material"
    ? "border-ctp-mauve/50 hover:border-ctp-mauve"
    : "border-ctp-surface1 hover:border-ctp-blue";
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {cards.map((entry) => {
        const card = cardImages.get(entry.name);
        const content = (
          <>
            {card?.editions[0]?.image ? <CardImage image={card.editions[0].image} alt={entry.name} className="aspect-[5/7] w-full rounded-lg object-cover object-top" /> : <div className="aspect-[5/7] w-full rounded-lg bg-ctp-surface0" />}
            <span className="mt-2 block truncate text-xs font-medium text-ctp-text">{entry.name}</span>
            <span className="block text-[10px] text-ctp-subtext0">{(entry.prevalence * 100).toFixed(0)}% of decks</span>
          </>
        );
        return card ? <Link key={entry.name} to={`/cards/${card.slug}`} className={`min-w-0 rounded-xl border bg-ctp-mantle p-2 transition-colors ${classes}`}>{content}</Link> : <div key={entry.name} className={`min-w-0 rounded-xl border bg-ctp-mantle p-2 ${classes}`}>{content}</div>;
      })}
    </div>
  );
}

export function QuantityStatsSection({ cards }: {
  cards: { name: string; quantities: { quantity: number; adjustedWinRate: number; deckCount: number }[] }[];
}) {
  if (cards.length === 0) return null;
  return (
    <Section className="mt-6" heading="dense" collapsible defaultOpen={false} title="Quantity vs. win rate" description="For this build's defining cards, does running more (or fewer) copies actually change the outcome? Figures are across all public decklists running the card, not scoped to this build alone.">
      <div className="mt-2 space-y-2">
        {cards.map((card) => <div key={card.name} className="text-sm"><span className="text-ctp-text">{card.name}</span><div className="mt-0.5 flex flex-wrap gap-4 text-ctp-subtext1">{card.quantities.map((quantity) => <span key={quantity.quantity}>{quantity.quantity}x: <span className="font-semibold text-ctp-text">{(quantity.adjustedWinRate * 100).toFixed(0)}%</span>{" "}<span className="text-xs text-ctp-subtext0">({quantity.deckCount} decks)</span></span>)}</div></div>)}
      </div>
    </Section>
  );
}
