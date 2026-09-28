import { useMemo } from "react";
import type { BookmarkedDeck, PublicDeckSummary } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import Panel from "../../components/ui/Panel";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";

const actionClass = "inline-flex min-h-12 items-center justify-center rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";

export function PublicDeckCard({ deck, onRemoveFavorite }: { deck: PublicDeckSummary | BookmarkedDeck; onRemoveFavorite?: () => void }) {
  const names = useMemo(() => deck.championName ? [deck.championName] : [], [deck.championName]);
  const exactCards = useCardsByNames(names);
  const championCards = useChampionCardImages(names);
  const champion = deck.championName ? exactCards.get(deck.championName) ?? championCards.get(deck.championName) : undefined;
  const championLabel = champion?.name ?? deck.championName ?? "Champion not specified";
  const art = <><CardArtTile card={champion} name={championLabel} /><span className="mt-2 block break-words text-xs font-medium leading-snug text-ctp-subtext1">{championLabel}</span></>;
  const url = `/decks/${deck.publicSlug}`;

  return <Panel data-component="PublicDeckCard" as="article" padding="none" className="flex h-full min-w-0 flex-col overflow-hidden">
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="min-w-0">{champion ? <Link to={`/cards/${champion.slug}`} aria-label={`Card details: ${championLabel}`} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{art}</Link> : art}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-xs font-medium text-ctp-subtext1"><span className="rounded-md bg-ctp-surface0 px-2 py-1">{deck.format === "STANDARD" ? "Standard" : deck.format === "PANTHEON" ? "Pantheon" : deck.format}</span>{deck.isSeed && <span className="rounded-md bg-ctp-blue/10 px-2 py-1 text-ctp-blue">Starter Library</span>}</div>
          <h2 className="mt-2 text-lg font-semibold leading-snug"><Link to={url} className="flex min-h-12 items-center break-words rounded hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{deck.title}</Link></h2>
          {deck.isSeed ? <p className="mt-2 text-xs leading-relaxed text-ctp-subtext0">Curated by Fan of Insight</p> : <Link to={`/users/${deck.owner.profileSlug}`} className="inline-flex min-h-12 max-w-full items-center break-words rounded text-sm text-ctp-subtext1 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">by {deck.owner.displayName}</Link>}
          <p className="mt-2 text-xs text-ctp-subtext0">{deck.likeCount} {deck.likeCount === 1 ? "like" : "likes"}<span aria-hidden="true"> · </span>Version {deck.versionNumber}</p>
        </div>
      </div>
      {deck.description && <p className="line-clamp-2 break-words text-sm leading-relaxed text-ctp-subtext1">{deck.description}</p>}
    </div>
    <div className="border-t border-ctp-surface1 p-3">
      <div className="flex items-start gap-2">
        <Link to={url} aria-label={`View deck: ${deck.title}`} className={`${actionClass} shrink-0 bg-ctp-blue text-ctp-base hover:brightness-110`}>View deck</Link>
        <details className="group min-w-0 flex-1">
          <summary className={`${actionClass} flex w-full cursor-pointer list-none gap-2 text-ctp-subtext1 hover:bg-ctp-surface0 [&::-webkit-details-marker]:hidden`}>Deck tools<DisclosureChevron className="group-open:rotate-180" /></summary>
          <div className="mt-2 flex flex-col gap-1">
            <Link to={`/deck-analysis?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} justify-start text-ctp-blue hover:bg-ctp-surface0`}>Analyze deck</Link>
            <Link to={`/deck-review?publicDeck=${encodeURIComponent(deck.publicSlug)}`} className={`${actionClass} justify-start text-ctp-blue hover:bg-ctp-surface0`}>Review suggestions</Link>
            {onRemoveFavorite && <button type="button" onClick={onRemoveFavorite} className={`${actionClass} justify-start text-left text-ctp-red hover:bg-ctp-red/10`}>Remove favorite</button>}
          </div>
        </details>
      </div>
    </div>
  </Panel>;
}
