import type { ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import CardImage from "./CardImage";
import ElementIcon from "./ElementIcon";

/**
 * The card-art box shared by every "visual" card grid on the site — full-bleed art, rounded
 * corners, a name fallback when no image is resolved, and an element badge (top-left) — plus
 * optional corner/tag overlays for callers that need them. Originally DecklistView's Visual
 * display mode (`VisualCardTile`); also used by TopCardsSections' grid layout and
 * ChampionSynergy's New Releases section, so "the same component" shows up everywhere a card
 * grid does. Callers still supply their own Link/CardHoverPreview wrapper and footer content
 * (name, count, price, combo info, etc.) since that varies per page.
 */
export default function CardArtTile({
  card,
  name,
  cornerBadge,
  tags,
}: {
  card: Card | undefined;
  name: string;
  cornerBadge?: ReactNode;
  tags?: string[];
}) {
  return (
    <div className="relative aspect-[5/7] overflow-hidden rounded bg-ctp-surface0">
      {card?.editions[0] ? (
        <CardImage image={card.editions[0].image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center p-1 text-center text-[9px] text-ctp-subtext0">{name}</span>
      )}
      {card && card.element !== "NORM" && (
        <span className="absolute left-1 top-1">
          <ElementIcon element={card.element} size={14} />
        </span>
      )}
      {cornerBadge !== undefined && (
        <span className="absolute right-1 top-1 rounded bg-ctp-base/90 px-1 text-[10px] text-ctp-text">{cornerBadge}</span>
      )}
      {tags && tags.length > 0 && (
        <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-0.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded border border-ctp-surface1 bg-ctp-base/90 px-1 text-[9px] text-ctp-subtext1">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
