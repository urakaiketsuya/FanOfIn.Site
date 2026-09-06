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
}

export default function UserDeckHeader({ title, championName, format, eyebrow, description, versionNumber, visibility }: Props) {
  const championImages = useChampionCardImages(championName ? [championName] : []);
  const championCard = championName ? championImages.get(championName) : undefined;

  return <header data-component="UserDeckHeader">
    {eyebrow && <div className="text-sm text-ctp-subtext1">{eyebrow}</div>}
    <div className="mt-2 flex items-center gap-3">
      <CardHoverPreview image={championCard?.editions[0]?.image} alt={championName ?? "Unknown champion"}>
        {championCard?.editions[0] ? <CardImage image={championCard.editions[0].image} alt={championName ?? ""} className="h-20 w-14 shrink-0 rounded object-cover object-top" /> : <div className="h-20 w-14 shrink-0 rounded bg-ctp-surface0" />}
      </CardHoverPreview>
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold text-ctp-blue">{title}</h1><p className="mt-1 text-sm text-ctp-subtext1">{championName ?? "Unknown champion"} · {format}{versionNumber ? ` · Version ${versionNumber}` : ""}</p></div>
      {visibility && <span className="rounded-full border border-ctp-surface1 px-3 py-1 text-xs capitalize text-ctp-subtext1">{visibility}</span>}
    </div>
    {description && <p className="mt-5 whitespace-pre-wrap text-ctp-subtext1">{description}</p>}
  </header>;
}
