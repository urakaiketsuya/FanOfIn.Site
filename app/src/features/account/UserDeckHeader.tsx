import "./UserDeckHeader.css";
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
  decklist?: OmnidexDecklist;
  /** Optional tournament or source statistics below the shared champion and format metadata. */
  statLine?: ReactNode;
  actions?: ReactNode;
}

export default function UserDeckHeader({ title, championName, format, eyebrow, description, versionNumber, visibility, statLine, decklist, actions }: Props) {
  const championImages = useChampionCardImages(championName ? [championName] : []);
  const exactCards = useCardsByNames([...(decklist?.material.map(line => line.card) ?? []), ...(championName ? [championName] : [])]);
  const leadName = decklist ? findDeckChampionName(decklist.material, exactCards) : null;
  const championCard = (leadName ? exactCards.get(leadName) : undefined) ?? (championName ? exactCards.get(championName) ?? championImages.get(championName) : undefined);

  return <header data-component="UserDeckHeader" className="deck-panorama identity-surface" style={identityStyle(deckAccent(championName))}>
    <div className="deck-panorama-art" aria-hidden="true">
      {championCard && <div className="deck-panorama-crop"><CardArtTile card={championCard} name={championCard.name} artworkOnly loading="eager" /></div>}
    </div>
    <div className="relative px-4 pb-4 sm:px-6 sm:pb-5">
      {eyebrow && <div className="mb-1 break-words text-sm text-ctp-subtext1 [&_a]:inline-flex [&_a]:min-h-control [&_a]:items-center">{eyebrow}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 w-full sm:w-auto sm:flex-1">
      <h1 className="break-words text-3xl font-bold leading-tight text-ctp-text sm:text-4xl">{title}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3">
        {championCard ? <Link to={`/cards/${championCard.slug}`} className="inline-flex min-h-control min-w-0 items-center break-words text-sm text-ctp-blue hover:underline">{championCard.name}</Link> : <span className="inline-flex min-h-control items-center text-sm text-ctp-subtext1">{championName ?? "Unknown champion"}</span>}
        <span className="text-xs text-ctp-subtext1">{format}{versionNumber ? ` · Version ${versionNumber}` : ""}</span>
        {visibility && <span className="rounded-full border border-ctp-surface1 bg-ctp-base/60 px-3 py-1 text-xs capitalize text-ctp-subtext1">{visibility}</span>}
      </div>
      {statLine && <p className="break-words text-sm text-ctp-subtext1">{statLine}</p>}
      </div>{actions && <div className="relative flex w-full max-w-full flex-wrap items-center gap-2 sm:w-auto [&>details]:ml-auto">{actions}</div>}</div>
      {description && <details className="group mt-1 max-w-3xl"><summary className="inline-flex min-h-control items-center cursor-pointer list-none text-sm font-medium text-ctp-blue [&::-webkit-details-marker]:hidden">About this deck <DisclosureChevron className="ml-1 inline-block transition-transform group-open:rotate-180" /></summary><p className="whitespace-pre-wrap break-words pb-1 text-sm leading-6 text-ctp-subtext1">{description}</p></details>}
    </div>
  </header>;
}
