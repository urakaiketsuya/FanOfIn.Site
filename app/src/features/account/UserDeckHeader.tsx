import type { DeckFormat, DeckVisibility } from "@gatcg/shared";
import type { ReactNode } from "react";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import { useChampionCardImages } from "../players/useChampionCardImages";

interface Props {
  title: string;
  championName: string | null;
  format: DeckFormat;
  eyebrow?: ReactNode;
  description?: string;
  versionNumber?: number;
  visibility?: DeckVisibility;
  prominent?: boolean;
  /** Replaces the default "{championName} · {format}" line — for a caller with something more
   * specific to say there (e.g. DeckDetail.tsx's tournament player/event/placement/win-rate line),
   * rather than that caller hand-rolling a whole parallel header around this component. */
  statLine?: ReactNode;
}

export default function UserDeckHeader({ title, championName, format, eyebrow, description, versionNumber, visibility, statLine, prominent = false }: Props) {
  const championImages = useChampionCardImages(championName ? [championName] : []);
  const championCard = championName ? championImages.get(championName) : undefined;

  return <header data-component="UserDeckHeader">
    {eyebrow && <div className="text-sm text-ctp-subtext1">{eyebrow}</div>}
    <div className={`mt-2 flex items-center ${prominent ? "gap-4" : "gap-3"}`}>
      <CardHoverPreview image={championCard?.editions[0]?.image} alt={championName ?? "Unknown champion"}>
        {championCard?.editions[0] ? <CardImage image={championCard.editions[0].image} alt={championName ?? ""} className={`${prominent ? "h-28 w-20 rounded-lg" : "h-20 w-14 rounded"} shrink-0 object-cover object-top`} /> : <div className={`${prominent ? "h-28 w-20 rounded-lg" : "h-20 w-14 rounded"} shrink-0 bg-ctp-surface0`} />}
      </CardHoverPreview>
      <div className="min-w-0 flex-1"><h1 className={`${prominent ? "text-2xl sm:text-3xl" : "text-2xl"} font-bold text-ctp-blue`}>{title}</h1><p className="mt-1 text-sm text-ctp-subtext1">{statLine ?? <>{championName ?? "Unknown champion"} · {format}{versionNumber ? ` · Version ${versionNumber}` : ""}</>}</p></div>
      {visibility && <span className="rounded-full border border-ctp-surface1 px-3 py-1 text-xs capitalize text-ctp-subtext1">{visibility}</span>}
    </div>
    {description && <details className="group mt-4 max-w-3xl"><summary className="min-h-10 cursor-pointer list-none text-sm font-medium text-ctp-blue [&::-webkit-details-marker]:hidden">About this deck <span aria-hidden="true" className="ml-1 inline-block transition-transform group-open:rotate-180">⌄</span></summary><p className="whitespace-pre-wrap pb-1 text-sm leading-6 text-ctp-subtext1">{description}</p></details>}
  </header>;
}
