import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import { toTopDecksListEntry } from "../topdecks/topDecksListEntry";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useEventNameById } from "../tournaments/data";
import { shortHash } from "../../lib/hash";
import { championNameToSlug } from "../../lib/championSlug";
import type { PopularDeck } from "./useDeckPopularity";
import Section from "../../components/ui/Section";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import DisclosureChevron from "../../components/DisclosureChevron";

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
      .map((entry) => toTopDecksListEntry(entry, eventNameById));
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

  return <DeckPreviewCard cardsByName={cardsByName} championCard={championCard} model={{
    id: shortHash(deck.signature), title: `${deck.championName ?? "Unknown Champion"} · Unique build`, decklist,
    championName: deck.championName, sideboardCount: null,
    source: { kind: "event", label: "Tournament build" },
    metadata: <>
      <p>{deck.playerCount} player{deck.playerCount === 1 ? "" : "s"}{deck.bestPlacement !== null && ` · Best #${deck.bestPlacement}`}</p>
      {deck.lastPlayedDate && <p>Last played {new Date(deck.lastPlayedDate).toLocaleDateString()}</p>}
    </>,
    actions: <Link to={`/decks/${shortHash(deck.signature)}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Open deck page</Link>,
    status: <details className="group text-xs text-ctp-subtext0">
      <summary className={`${deckPreviewActionClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Build details<DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <span>{deck.sightingCount} appearance{deck.sightingCount === 1 ? "" : "s"}</span>
        {deck.sightingCount > 1 && <span>{(deck.avgWinRate * 100).toFixed(0)}% win rate</span>}
        {[...deck.elements, ...deck.classes].map(label => <span key={label} className="capitalize">{label.toLowerCase()}</span>)}
        {deck.championName && <Link to={`/champions/${championNameToSlug(deck.championName)}`} className={`${deckPreviewActionClass} text-ctp-blue`}>{deck.championName}</Link>}
        {deck.lastEventId && latestEventName && <Link to={`/events/${deck.lastEventId}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Latest event: {latestEventName}</Link>}
      </div>
    </details>,
  }} view={{ expanded, onToggle: () => setExpanded(value => !value), content: <ExpandedDeckRow deck={deck} decklist={decklist} cardsByName={cardsByName} playerName={playerName} /> }} />;
}
