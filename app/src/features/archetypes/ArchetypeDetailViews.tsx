import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
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
    ? "rounded-md border border-ctp-mauve/60 bg-ctp-mauve/5 px-2 py-1 text-ctp-text hover:border-ctp-mauve hover:text-ctp-mauve"
    : "rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-text hover:border-ctp-blue hover:text-ctp-blue";
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-sm">
      {cards.map((entry) => {
        const card = cardImages.get(entry.name);
        const content = <>{entry.name} <span className="text-ctp-subtext0">({(entry.prevalence * 100).toFixed(0)}%)</span></>;
        return (
          <CardHoverPreview key={entry.name} image={card?.editions[0]?.image} alt={entry.name}>
            {card ? <Link to={`/cards/${card.slug}`} className={classes}>{content}</Link> : <span className={classes.replace(/ hover:[^ ]+/g, "")}>{content}</span>}
          </CardHoverPreview>
        );
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
