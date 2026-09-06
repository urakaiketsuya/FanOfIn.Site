import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useCardsByNames } from "../events/useCardsByNames";
import { useChampionCardImages } from "../players/useChampionCardImages";

export default function DeckVisualStrip({ decklist, championName }: { decklist: OmnidexDecklist; championName: string | null }) {
  const featuredLines = useMemo(() => decklist.main.slice(0, 4), [decklist.main]);
  const cardsByName = useCardsByNames(useMemo(() => featuredLines.map((line) => line.card), [featuredLines]));
  const championImages = useChampionCardImages(useMemo(() => championName ? [championName] : [], [championName]));
  const championCard = championName ? championImages.get(championName) : undefined;

  return <div data-component="DeckVisualStrip" className="mt-4 flex h-24 gap-2 overflow-hidden rounded-lg bg-ctp-base p-2" aria-label="Featured deck cards">
    <CardHoverPreview image={championCard?.editions[0]?.image} alt={championName ?? "Unknown champion"}>
      {championCard?.editions[0] ? <Link to={`/cards/${championCard.slug}`} title={championCard.name} className="block h-20 w-14 shrink-0 overflow-hidden rounded border border-ctp-blue/40"><CardImage image={championCard.editions[0].image} alt={championCard.name} className="h-full w-full object-cover object-top" /></Link> : <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-ctp-surface1 bg-ctp-surface0 px-1 text-center text-[9px] text-ctp-subtext0">{championName ?? "Champion"}</div>}
    </CardHoverPreview>
    <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">{featuredLines.map((line) => {
      const card = cardsByName.get(line.card);
      const content = <>{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover object-top" /> : <span className="flex h-full items-center justify-center p-1 text-center text-[8px] text-ctp-subtext0">{line.card}</span>}<span className="absolute right-0.5 top-0.5 rounded bg-ctp-base/90 px-1 text-[9px] text-ctp-text">{line.quantity}x</span></>;
      return <CardHoverPreview key={line.card} image={card?.editions[0]?.image} alt={line.card}>{card ? <Link to={`/cards/${card.slug}`} title={line.card} className="relative block h-20 overflow-hidden rounded bg-ctp-surface0">{content}</Link> : <div title={line.card} className="relative h-20 overflow-hidden rounded bg-ctp-surface0">{content}</div>}</CardHoverPreview>;
    })}</div>
  </div>;
}
