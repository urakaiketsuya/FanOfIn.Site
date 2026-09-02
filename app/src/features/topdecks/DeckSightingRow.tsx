import { useState } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckSighting } from "@gatcg/shared";
import { EVENT_CATEGORY_LABELS } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { useSightingDecklist } from "./useSightingDecklist";
import { formatUsd } from "../../lib/format";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

export default function DeckSightingRow({
  sighting,
  playerName,
  championCard,
  onAdd,
  added,
}: {
  sighting: DeckSighting;
  playerName: string;
  championCard: Card | undefined;
  /** When provided, renders an extra "+ Compare"/"− Remove" toggle button (used by the deck comparison tool). */
  onAdd?: () => void;
  added?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error } = useSightingDecklist(sighting.eventId, sighting.player, expanded && !sighting.deckHash);
  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);

  return (
    <div className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
      {/* Thumbnail + identity only in this row — stats and action buttons get their own full-width
          row below instead of competing with this one for space, which on a narrow viewport used to
          squeeze this row's flexible middle column down to almost nothing (badges wrapping onto top
          of each other, buttons overlapping the price line). */}
      <div className="flex items-start gap-3">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={sighting.championName ?? "Unknown champion"}>
          {sighting.deckHash ? (
            <Link to={`/decks/${sighting.deckHash}`} title="Open this deck's own page" className="block shrink-0">
              {championCard?.editions[0] ? (
                <CardImage
                  image={championCard.editions[0].image}
                  alt={sighting.championName ?? ""}
                  className="h-14 w-10 shrink-0 rounded object-cover object-top"
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Hide decklist" : "Show decklist"}
              aria-expanded={expanded}
              aria-controls={`decklist-${sighting.deckId}`}
              aria-label={expanded ? "Hide decklist" : "Show decklist"}
              className="block shrink-0"
            >
              {championCard?.editions[0] ? (
                <CardImage
                  image={championCard.editions[0].image}
                  alt={sighting.championName ?? ""}
                  className="h-14 w-10 shrink-0 rounded object-cover object-top"
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
              )}
            </button>
          )}
        </CardHoverPreview>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {sighting.championName && sighting.deckHash ? (
              <Link to={`/decks/${sighting.deckHash}`} className="font-medium text-ctp-text hover:text-ctp-blue">
                {sighting.championName}
              </Link>
            ) : sighting.championName ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Hide decklist" : "Show decklist"}
                aria-expanded={expanded}
                aria-controls={`decklist-${sighting.deckId}`}
                aria-label={`${expanded ? "Hide" : "Show"} decklist for ${sighting.championName}`}
                className="font-medium text-ctp-text hover:text-ctp-blue"
              >
                {sighting.championName}
              </button>
            ) : (
              <span className="text-ctp-subtext0">Unknown champion</span>
            )}
            <PlayerLink id={sighting.player} username={playerName} className="text-ctp-subtext1 hover:text-ctp-blue" />
            {sighting.winner && (
              <span className="rounded-full border border-ctp-yellow px-1.5 text-[10px] text-ctp-yellow">Winner</span>
            )}
            {sighting.topCut && !sighting.winner && (
              <span className="rounded-full border border-ctp-blue px-1.5 text-[10px] text-ctp-blue">Top Cut</span>
            )}
            {sighting.placementPercentile !== null && (
              <span className="rounded-full border border-ctp-green px-1.5 text-[10px] text-ctp-green">
                Top {sighting.placementPercentile < 0.01 ? "<1" : Math.round(sighting.placementPercentile * 100)}%
              </span>
            )}
            {sighting.duplicateCount > 0 && (
              <span className="rounded-full border border-ctp-mauve px-1.5 text-[10px] text-ctp-mauve">
                Netdecked ({sighting.duplicateCount} other{sighting.duplicateCount === 1 ? "" : "s"})
              </span>
            )}
            {sighting.underplaced && (
              <span
                className="rounded-full border border-ctp-peach px-1.5 text-[10px] text-ctp-peach"
                title="Strong match record, but still finished outside the top 30% of the field — likely tiebreakers, not a bad build."
              >
                Tough finish
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-ctp-subtext0">
            <Link to={`/events/${sighting.eventId}`} className="hover:text-ctp-blue hover:underline">
              {sighting.eventName}
            </Link>{" "}
            · {EVENT_CATEGORY_LABELS[sighting.eventCategory] ?? sighting.eventCategory} ·{" "}
            {new Date(sighting.eventDate).toLocaleDateString()}
            {sighting.seasonName && ` · ${sighting.seasonName}`}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-ctp-subtext1">
          {sighting.placement ? `#${sighting.placement}` : "—"} · {sighting.wins}-{sighting.losses}-{sighting.ties}
          {sighting.price !== null && <span className="text-ctp-subtext0"> · {formatUsd(sighting.price)}</span>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className={`rounded-md border px-2 py-1.5 text-xs ${
                added ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {added ? "− Remove" : "+ Compare"}
            </button>
          )}

          {sighting.deckHash ? (
            <Link
              to={`/decks/${sighting.deckHash}`}
              className="rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text"
            >
              Decklist &rarr;
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`decklist-${sighting.deckId}`}
            >
              {expanded ? "Hide" : "Decklist"}
            </Button>
          )}
        </div>
      </div>

      {expanded && !sighting.deckHash && (
        <div id={`decklist-${sighting.deckId}`} className="mt-2 border-t border-ctp-surface0 pt-2">
          {loading && <InlineState className="text-sm">Loading…</InlineState>}
          {error && <InlineState className="text-sm">{error}</InlineState>}
          {decklist && <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={sighting.deckId} />}
        </div>
      )}
    </div>
  );
}
