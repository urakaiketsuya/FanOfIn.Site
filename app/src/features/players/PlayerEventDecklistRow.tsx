import { usePlayerNameById } from "../tournaments/data";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type DeckPopularityEntry, type OmnidexEventSummary } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useChampionCardImages } from "./useChampionCardImages";
import { championNameToSlug } from "../../lib/championSlug";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { usePlayerDecklist } from "./usePlayerDecklist";
import { useTopDecksForChampion } from "../decks/useTopDecksForChampion";
import { findDeckChampionName } from "../../lib/ttsExport";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

export default function PlayerEventDecklistRow({ event, playerId, result, resultsLoaded }: {
  event: OmnidexEventSummary;
  playerId: number;
  result?: DeckPopularityEntry;
  resultsLoaded: boolean;
}) {
  const playerName = usePlayerNameById();
  const panelId = useId();
  const championCards = useChampionCardImages(result?.championName ? [result.championName] : []);
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error, retry } = usePlayerDecklist(event.id, playerId, expanded);
  const deckId = `${event.id}:${playerId}`;

  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);
  // findDeckChampionName resolves the specific print (e.g. "Guo Jia, Heaven's Favored") – every
  // dataset useTopDecksForChampion reads is keyed by the base Champion name instead, same
  // conversion used by Compare's ComparisonSuggestions.
  const printName = decklist ? findDeckChampionName(decklist.material, cardsByName) : null;
  const championName = result?.championName ?? (printName ? printName.split(",")[0].trim() : null);
  const topDecks = useTopDecksForChampion(expanded ? championName : null, deckId);

  return (
    <article data-component="PlayerEventDecklistRow" className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:p-4">
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
        <div className="row-span-2 self-start sm:row-span-1">
          {championName ? <Link to={`/champions/${championNameToSlug(championName)}`} aria-label={`${championName} champion`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
            <CardArtTile card={championCards.get(championName) ?? (printName ? cardsByName.get(printName) : undefined)} name={championName} />
          </Link> : <div className="flex aspect-[5/7] items-center justify-center rounded bg-ctp-surface0 p-1 text-center text-xs break-words text-ctp-subtext0"><span className="min-w-0 [overflow-wrap:anywhere]">Champion unavailable</span></div>}
        </div>
        <div className="min-w-0 break-words">
          <h3 className="text-sm font-semibold leading-snug"><Link to={`/events/${event.id}?player=${playerId}`} className="block min-h-control content-center break-words rounded text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue [overflow-wrap:anywhere]">{event.name}</Link></h3>
          <p className="text-xs text-ctp-subtext0"><time dateTime={event.date}>{new Date(event.date).toLocaleDateString()}</time> · {EVENT_CATEGORY_LABELS[event.category] ?? event.category}</p>
          {championName && <p className="mt-1 text-sm font-medium text-ctp-text">{championName}</p>}
        </div>
        <div className="col-start-2 min-w-0 break-words flex flex-wrap items-baseline gap-x-3 tabular-nums sm:col-start-auto sm:block sm:text-right">
          {result ? <>
            <p>{result.placement !== null && result.placement > 0 ? <><strong className="text-xl text-ctp-text">#{result.placement}</strong><span className="ml-1 text-xs text-ctp-subtext0">{event.playerCount > 0 ? `/ ${event.playerCount}` : 'place'}</span></> : <span className="text-xs text-ctp-subtext0">Placement unavailable</span>}</p>
            <p className="text-xs text-ctp-subtext1 sm:mt-1">{result.wins}W · {result.losses}L · {result.ties}T</p>
          </> : <p className="max-w-full text-xs text-ctp-subtext0">{resultsLoaded ? 'Result unavailable' : 'Loading result…'}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface0 pt-2">
        <span className="text-xs text-ctp-subtext0">{result ? 'Public deck' : resultsLoaded ? 'Deck unavailable' : 'Loading deck status…'}</span>
        {result && <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} aria-controls={panelId} className="inline-flex items-center gap-2">
          {expanded ? "Hide deck" : "View deck"}<DisclosureChevron className={expanded ? "rotate-180" : ""} />
        </Button>}
      </div>
      <div id={panelId} hidden={!expanded}>
        {expanded && <div className="mt-2 border-t border-ctp-surface1 pt-3">
          {loading && <p role="status" className="text-sm text-ctp-subtext1">Loading deck…</p>}
          {error && <div role="alert"><InlineState className="text-sm">{error}</InlineState><Button size="sm" className="mt-2" onClick={retry}>Retry deck</Button></div>}
          {decklist && (
            <>
              {(topDecks.bestOverall || topDecks.bestArchetype) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {topDecks.bestOverall && (
                    <Link
                      to={`/compare?add=${deckId},${topDecks.bestOverall.eventId}:${topDecks.bestOverall.player}`}
                      className="inline-flex min-h-control items-center rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                    >
                      Compare with best {championName} deck &rarr;
                    </Link>
                  )}
                  {topDecks.bestArchetype && (
                    <Link
                      to={`/compare?add=${deckId},${topDecks.bestArchetype.eventId}:${topDecks.bestArchetype.player}`}
                      className="inline-flex min-h-control items-center rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                    >
                      Compare with top {topDecks.bestArchetype.clusterName} build &rarr;
                    </Link>
                  )}
                </div>
              )}
              <DecklistView deckOwner={playerName(playerId)} decklist={decklist} cardsByName={cardsByName} deckId={deckId} showThumbnails />
            </>
          )}
        </div>}
      </div>
    </article>
  );
}
