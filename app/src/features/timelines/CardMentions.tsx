import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";

/** A card name as called by casters may not exactly match the card DB (ASR errors, shorthand) —
 * anything that doesn't resolve via useCardsByMentions falls back to a plain text badge rather than
 * being dropped, so an unmatched name is still visible (just not linked/thumbnailed). */
export default function CardMentions({ names, cardsByName }: { names: string[]; cardsByName: Map<string, Card> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {names.map((name, i) => {
        const card = cardsByName.get(name);
        if (!card) {
          return (
            <span key={`${name}-${i}`} className="rounded-md border border-ctp-surface1 px-1.5 py-1 text-xs text-ctp-subtext1">
              {name}
            </span>
          );
        }
        const image = card.editions[0]?.image;
        return (
          <CardHoverPreview key={`${name}-${i}`} image={image} alt={name}>
            <Link
              to={`/cards/${card.slug}`}
              className="flex items-center gap-1.5 rounded-md border border-ctp-surface1 bg-ctp-base/40 py-1 pl-1 pr-2 text-xs font-medium text-ctp-text hover:border-ctp-blue/60"
            >
              <CardImage image={image} alt={name} className="h-7 w-5 shrink-0 rounded-sm object-cover object-top" />
              {card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
              {name}
            </Link>
          </CardHoverPreview>
        );
      })}
    </div>
  );
}
