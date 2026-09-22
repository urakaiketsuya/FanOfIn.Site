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
import Button from "../../components/ui/Button";
import DeckCardPreview from "../decks/DeckCardPreview";

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

  return (
    <div data-component="PopularDeckRow" className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 text-sm shadow-sm shadow-black/20">
      <DeckCardPreview names={deck.main.map((line) => line.name)} cardsByName={cardsByName} championCard={championCard} seed={deck.signature} loading={deck.main.length > 0 && cardsByName.size === 0} />
      <div className="mt-3">
        {deck.championName ? (
          <Link to={`/champions/${championNameToSlug(deck.championName)}`} className="font-medium text-ctp-text hover:text-ctp-blue">
            {deck.championName}
          </Link>
        ) : (
          <span className="text-ctp-subtext0">Unknown champion</span>
        )}
        <div className="mt-1 text-xs text-ctp-subtext1">Unique build</div>
        <div className="mt-2 font-semibold text-ctp-text">
          {deck.playerCount} player{deck.playerCount === 1 ? "" : "s"}
          {deck.bestPlacement !== null && <span className="font-normal text-ctp-subtext1"> · Best #{deck.bestPlacement}</span>}
        </div>
        {deck.lastPlayedDate && <div className="mt-1 text-xs text-ctp-subtext0">Last played {new Date(deck.lastPlayedDate).toLocaleDateString()}</div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ctp-surface1 pt-3">
        <Link to={`/decks/${shortHash(deck.signature)}`} className="flex min-h-10 flex-1 items-center justify-center rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">
          View deck →
        </Link>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mt-1 w-full text-ctp-subtext0">
        {expanded ? "Hide decklist preview" : "Preview decklist"}
      </Button>
      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Build details</summary>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>{deck.sightingCount} appearance{deck.sightingCount === 1 ? "" : "s"}</span>
          {deck.sightingCount > 1 && <span>{(deck.avgWinRate * 100).toFixed(0)}% win rate</span>}
          {[...deck.elements, ...deck.classes].map((label) => <span key={label} className="capitalize">{label.toLowerCase()}</span>)}
          {deck.lastEventId && latestEventName && <Link to={`/events/${deck.lastEventId}`} className="text-ctp-blue hover:underline">Latest event: {latestEventName}</Link>}
        </div>
      </details>

      {expanded && <ExpandedDeckRow deck={deck} decklist={decklist} cardsByName={cardsByName} playerName={playerName} />}
    </div>
  );
}
