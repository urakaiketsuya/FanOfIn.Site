import DeckPreviewListActions from "../../components/DeckPreviewListActions";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckSighting } from "@gatcg/shared";
import { EVENT_CATEGORY_LABELS } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";
import { useCardsByNames } from "../events/useCardsByNames";
import { useSightingDecklist } from "./useSightingDecklist";
import { formatUsd } from "../../lib/format";
import { InlineState } from "../../components/ui/ContentState";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function DeckSightingRow({ sighting, playerName, championCard, onAdd, added, browseCard = false }: {
  sighting: DeckSighting;
  playerName: string;
  championCard: Card | undefined;
  onAdd?: () => void;
  added?: boolean;
  /** Retained for existing callers; every immutable result now uses the shared preview. */
  browseCard?: boolean;
}) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rowRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPreviewVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);
  const { loading, decklist, error, format } = useSightingDecklist(sighting.eventId, sighting.player, previewVisible);
  const cardsByName = useCardsByNames(decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map(line => line.card) : []);
  return <div ref={rowRef} data-component="DeckSightingRow" className="min-w-0">
    {browseCard && loading && <p role="status" className="text-xs text-ctp-subtext0">Loading deck preview…</p>}
    {browseCard && error && <InlineState tone="danger">{error}</InlineState>}
    <DeckPreviewCard presentation={browseCard ? "cover" : "detail"} cardsByName={cardsByName} championCard={championCard} model={{
      id: sighting.deckId, title: browseCard ? (sighting.championName ?? `${playerName}'s deck`) : sighting.championName ? `${sighting.championName} · ${playerName}` : `${playerName}'s deck`,
      decklist, format, championName: sighting.championName,
      source: { kind: "event", label: "Tournament" },
      metadata: browseCard ? <p>{playerName} · {sighting.placement ? `#${sighting.placement}` : "Unranked"}<span className="mt-1 block text-xs text-ctp-subtext0">{sighting.eventName}</span></p> : <>
        <PlayerLink id={sighting.player} username={playerName} className="inline-flex min-h-12 items-center rounded hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" />
        <p>{sighting.placement ? `#${sighting.placement}` : "Unranked"} · {sighting.wins}–{sighting.losses}–{sighting.ties}{sighting.winner ? " · Winner" : sighting.topCut ? " · Top Cut" : ""}</p>
        <Link to={`/events/${sighting.eventId}`} className="inline-flex min-h-12 items-center rounded hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{sighting.eventName}</Link>
        <p>{new Date(sighting.eventDate).toLocaleDateString()}</p>
      </>,
      status: <>
        {loading && <p role="status" className="text-xs text-ctp-subtext0">Loading deck preview…</p>}
        {error && <InlineState tone="danger">{error}</InlineState>}
        <details className="group text-xs text-ctp-subtext0">
          <summary className={`${deckPreviewActionClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Result details<DisclosureChevron className="group-open:rotate-180" /></summary>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>{EVENT_CATEGORY_LABELS[sighting.eventCategory] ?? sighting.eventCategory}</span>
            {sighting.seasonName && <span>{sighting.seasonName}</span>}
            {sighting.price !== null && <span>Estimated price {formatUsd(sighting.price)}</span>}
            {sighting.placementPercentile !== null && <span>Top {sighting.placementPercentile < 0.01 ? "<1" : Math.round(sighting.placementPercentile * 100)}% of field</span>}
            {sighting.duplicateCount > 0 && <span>Played by {sighting.duplicateCount + 1} players</span>}
            {sighting.underplaced && <span>Tough finish</span>}
          </div>
        </details>
      </>,
      actions: <>
        {decklist && <DeckPreviewListActions decklist={decklist} format={format} title={`${sighting.championName ?? "Deck"} · ${playerName}`} compare={!onAdd} />}
        {onAdd && <button type="button" onClick={onAdd} aria-pressed={added ?? false} className={`${deckPreviewActionClass} border ${added ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{added ? "Remove from compare" : "Compare"}</button>}
      </>,
    }} view={{ to: sighting.deckHash ? `/decks/${sighting.deckHash}` : `/events/${sighting.eventId}?tab=decklists&player=${sighting.player}` }} />
  </div>;
}
