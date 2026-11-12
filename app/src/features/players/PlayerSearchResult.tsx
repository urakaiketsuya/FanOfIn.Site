import type { ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { cardImagePath } from "../../lib/previewCards";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";

export function PersonAvatar({ championName, card }: { championName: string; card: Card | undefined }) {
  return (
    <CardHoverPreview image={cardImagePath(card)} alt={championName}>
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ctp-surface0">
        {card && cardImagePath(card) && (
          <CardImage
            image={cardImagePath(card)}
            alt={championName}
            className="h-full w-full origin-[50%_20%] scale-[3] object-cover object-top"
          />
        )}
      </div>
    </CardHoverPreview>
  );
}


export default function PlayerSearchResult({ playerId, name, rank, championName, card, region, children }: {
  playerId: number;
  name: string;
  rank?: number;
  championName?: string;
  card?: Card;
  region?: string;
  children: ReactNode;
}) {
  return <Link to={`/players/${playerId}`} className="grid min-h-control min-w-0 gap-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue sm:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
    <div className="flex min-w-0 items-center gap-3">
      <span className="text-sm tabular-nums text-ctp-subtext0">{rank ? `#${rank}` : "—"}</span>
      <PersonAvatar championName={championName ?? "Nameless Champion"} card={card} />
      <div className="min-w-0">
        <span className="block break-words font-semibold">{name}</span>
        <span className="text-xs text-ctp-subtext1">{championName ?? "No public decks"}</span>
        {region && <span className="block text-xs text-ctp-subtext1">{region} · inferred</span>}
      </div>
    </div>
    <div className="grid grid-cols-[0.85fr_1.3fr_1fr] gap-2">{children}</div>
  </Link>;
}
