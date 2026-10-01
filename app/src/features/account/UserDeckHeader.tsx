import { findDeckChampionName } from "../../lib/ttsExport";
import DisclosureChevron from "../../components/DisclosureChevron";
import type { DeckFormat, DeckVisibility, OmnidexDecklist } from "@gatcg/shared";
import type { ReactNode } from "react";
import CardArtTile from "../../components/CardArtTile";
import { useCardsByNames } from "../events/useCardsByNames";
import { Link } from "react-router-dom";
import { deckAccent, identityStyle } from "./deckAppearance";
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
  decklist?: OmnidexDecklist;
  /** Replaces the default "{championName} · {format}" line – for a caller with something more
   * specific to say there (e.g. DeckDetail.tsx's tournament player/event/placement/win-rate line),
   * rather than that caller hand-rolling a whole parallel header around this component. */
  statLine?: ReactNode;
}

export default function UserDeckHeader({ title, championName, format, eyebrow, description, versionNumber, visibility, statLine, prominent = false, decklist }: Props) {
  const championImages = useChampionCardImages(championName ? [championName] : []);
  const exactCards = useCardsByNames([...(decklist?.material.map(line => line.card) ?? []), ...(championName ? [championName] : [])]);
  const leadName = decklist ? findDeckChampionName(decklist.material, exactCards) : null;
  const championCard = (leadName ? exactCards.get(leadName) : undefined) ?? (championName ? exactCards.get(championName) ?? championImages.get(championName) : undefined);

  return <header data-component="UserDeckHeader" className={prominent ? "identity-surface rounded-2xl p-4 sm:p-6" : undefined} style={prominent ? identityStyle(deckAccent(championName)) : undefined}>
    {eyebrow && <div className="text-sm text-ctp-subtext1">{eyebrow}</div>}
    <div className={`mt-2 flex flex-wrap items-center ${prominent ? "gap-4 sm:gap-6" : "gap-3"}`}>
      <div className={`${prominent ? "w-24 sm:w-32" : "w-16"} shrink-0`}>
        {championCard ? <Link to={`/cards/${championCard.slug}`} aria-label={`View ${championCard.name}`}><CardArtTile card={championCard} name={championCard.name} /></Link> : <CardArtTile card={undefined} name={championName ?? "Unknown champion"} />}
        {championCard && <p className="mt-1 break-words text-xs text-ctp-subtext1">{championCard.name}</p>}
      </div>
      <div className="min-w-0 flex-1"><h1 className={`${prominent ? "text-2xl sm:text-4xl" : "text-2xl"} break-words font-bold leading-tight text-ctp-text`}>{title}</h1><p className="mt-2 break-words text-sm text-ctp-subtext1">{statLine ?? <>{championName ?? "Unknown champion"} · {format}{versionNumber ? ` · Version ${versionNumber}` : ""}</>}</p>{visibility && <span className="mt-3 inline-block rounded-full border border-ctp-surface1 bg-ctp-base/60 px-3 py-1 text-xs capitalize text-ctp-subtext1">{visibility}</span>}</div>
    </div>
    {description && <details className="group mt-4 max-w-3xl"><summary className="inline-flex min-h-control items-center cursor-pointer list-none text-sm font-medium text-ctp-blue [&::-webkit-details-marker]:hidden">About this deck <DisclosureChevron className="ml-1 inline-block transition-transform group-open:rotate-180" /></summary><p className="whitespace-pre-wrap pb-1 text-sm leading-6 text-ctp-subtext1">{description}</p></details>}
  </header>;
}
