import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useEventNameById } from "../tournaments/data";
import { shortHash } from "../../lib/hash";
import { championNameToSlug } from "../../lib/championSlug";
import type { PopularDeck } from "./useDeckPopularity";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";

/**
 * The decklist + "played by" section, split out so its useDeckPopularityIndexData() call only
 * fires once a row is actually expanded — not for every one of the ~30 rows rendered on page
 * load. That call used to sit directly in PopularDeckRow, unconditionally, and used to be the
 * full 40MB+ deck-sightings.json before the popularity-index migration below — either way, only
 * fetching it on expand avoids a real mobile-crash contributor (see git history around the fix).
 */
function ExpandedDeckRow({
  deck,
  decklist,
  cardsByName,
  playerName,
}: {
  deck: PopularDeck;
  decklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  playerName: (id: number) => string;
}) {
  const popularityIndexData = useDeckPopularityIndexData();
  const eventNameById = useEventNameById();

  const instances = useMemo(() => {
    if (!popularityIndexData) return [];
    const deckIdSet = new Set(deck.deckIds);
    return popularityIndexData.entries
      .filter((e) => deckIdSet.has(e.deckId))
      .sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity))
      .map((e) => ({
        deckId: e.deckId,
        player: e.player,
        eventId: e.eventId,
        eventName: eventNameById.get(e.eventId) ?? `Event #${e.eventId}`,
        placement: e.placement,
        wins: e.wins,
        losses: e.losses,
        ties: e.ties,
        underplaced: e.underplaced,
      }));
  }, [popularityIndexData, deck.deckIds, eventNameById]);

  return (
    <div className="mt-2 border-t border-ctp-surface0 pt-2">
      <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={deck.deckIds[0]} showThumbnails />

      <Section className="mt-4" heading="dense" title={`Played by (${instances.length})`}>
        <div className="mt-2">
          <TopDecksList decks={instances} playerName={playerName} />
        </div>
      </Section>
    </div>
  );
}

export default function PopularDeckRow({
  deck,
  playerName,
  championCard,
  latestEventName,
}: {
  deck: PopularDeck;
  playerName: (id: number) => string;
  championCard: Card | undefined;
  latestEventName?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: deck.main.map((l) => ({ card: l.name, quantity: l.quantity })),
      material: deck.material.map((l) => ({ card: l.name, quantity: l.quantity })),
      sideboard: [],
    }),
    [deck],
  );
  const allNames = useMemo(() => [...deck.main, ...deck.material].map((l) => l.name), [deck]);
  const cardsByName = useCardsByNames(allNames);

  return (
    <div data-component="PopularDeckRow" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={deck.championName ?? "Unknown champion"}>
          {championCard?.editions[0] ? (
            <CardImage
              image={championCard.editions[0].image}
              alt={deck.championName ?? ""}
              className="h-14 w-10 shrink-0 rounded object-cover object-top"
            />
          ) : (
            <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />
          )}
        </CardHoverPreview>

        <div className="min-w-0 flex-1">
          {deck.championName ? (
            <Link
              to={`/champions/${championNameToSlug(deck.championName)}`}
              className="font-medium text-ctp-text hover:text-ctp-blue"
            >
              {deck.championName}
            </Link>
          ) : (
            <span className="text-ctp-subtext0">Unknown champion</span>
          )}
          {deck.lastPlayedDate && (
            <div className="mt-0.5 truncate text-xs text-ctp-subtext0">
              Most recently played{deck.lastEventId && latestEventName ? (
                <> at <Link to={`/events/${deck.lastEventId}`} className="hover:text-ctp-blue hover:underline">{latestEventName}</Link></>
              ) : null} · {new Date(deck.lastPlayedDate).toLocaleDateString()}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ctp-subtext1">
            <span>{deck.playerCount} player{deck.playerCount === 1 ? "" : "s"}</span>
            <span aria-hidden="true">·</span>
            <span>{deck.sightingCount} appearance{deck.sightingCount === 1 ? "" : "s"}</span>
            {deck.bestPlacement !== null && <><span aria-hidden="true">·</span><span>Best #{deck.bestPlacement}</span></>}
            {deck.sightingCount > 1 && <><span aria-hidden="true">·</span><span>{(deck.avgWinRate * 100).toFixed(0)}% win rate</span></>}
            {[...deck.elements, ...deck.classes].map((label) => (
              <span key={label} className="rounded-full border border-ctp-surface1 px-1.5 py-0.5 text-[10px] capitalize text-ctp-subtext0">{label.toLowerCase()}</span>
            ))}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="shrink-0">
            {expanded ? "Hide preview" : "Preview"}
          </Button>
          <Link
            to={`/decks/${shortHash(deck.signature)}`}
            className="shrink-0 rounded-md border border-ctp-blue px-2 py-1.5 text-xs text-ctp-blue hover:bg-ctp-surface0"
          >
            View build &rarr;
          </Link>
        </div>
      </div>

      {expanded && <ExpandedDeckRow deck={deck} decklist={decklist} cardsByName={cardsByName} playerName={playerName} />}
    </div>
  );
}
