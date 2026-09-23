import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../../components/CardHoverPreview";
import ElementIcon from "../../../components/ElementIcon";
import ElementRail from "../../../components/ElementRail";
import { primaryAlternateFace } from "../../../lib/cardFaces";

export default function BuilderMaybeboard({
  cards, catalogByName, lockedCards, onQuantityChange, onPromote, onRemove,
}: {
  cards: Map<string, number>;
  catalogByName: Map<string, Card>;
  lockedCards: Map<string, number>;
  onQuantityChange: (name: string, quantity: number) => void;
  onPromote: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  if (cards.size === 0) return null;

  return (
    <details className="mt-4 rounded-lg border border-dashed border-ctp-yellow/60 bg-ctp-yellow/5 p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Maybeboard ({cards.size})</summary>
      <ul className="mt-2 space-y-1">
        {Array.from(cards.entries()).map(([name, quantity]) => {
          const card = catalogByName.get(name);
          const reverseFace = primaryAlternateFace(card);
          return (
            <li key={name} className="relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ctp-yellow/30 bg-ctp-base py-1 pl-3 pr-2 text-sm">
              <ElementRail elements={card?.elements} />
              <input type="number" min={1} max={4} value={quantity} aria-label={`Copies of ${name} in maybeboard`} onChange={(event) => onQuantityChange(name, Number(event.target.value))} className="w-11 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text" />
              {card && <ElementIcon element={card.element} size={14} />}
              <CardHoverPreview image={card?.editions[0]?.image} backImage={reverseFace?.edition.image} backAlt={reverseFace?.name} alt={name}>
                {card ? <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{name}</Link> : <span className="text-ctp-text">{name}</span>}
              </CardHoverPreview>
              <div className="ml-auto flex gap-1.5">
                <button type="button" disabled={lockedCards.has(name)} onClick={() => onPromote(name)} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-40">Add to deck</button>
                <button type="button" onClick={() => onRemove(name)} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-red">Remove</button>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
