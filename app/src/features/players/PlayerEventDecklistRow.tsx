import { useState } from "react";
import { Link } from "react-router-dom";
import type { OmnidexEventSummary } from "@gatcg/shared";
import EventRow from "../tournaments/EventRow";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { usePlayerDecklist } from "./usePlayerDecklist";
import { useTopDecksForChampion } from "../decks/useTopDecksForChampion";
import { findDeckChampionName } from "../../lib/ttsExport";

export default function PlayerEventDecklistRow({ event, playerId }: { event: OmnidexEventSummary; playerId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error } = usePlayerDecklist(event.id, playerId, expanded);
  const deckId = `${event.id}:${playerId}`;

  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);
  // findDeckChampionName resolves the specific print (e.g. "Guo Jia, Heaven's Favored") — every
  // dataset useTopDecksForChampion reads is keyed by the base Champion name instead, same
  // conversion used by Compare's ComparisonSuggestions.
  const printName = decklist ? findDeckChampionName(decklist.material, cardsByName) : null;
  const championName = printName ? printName.split(",")[0].trim() : null;
  const topDecks = useTopDecksForChampion(championName, deckId);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <EventRow event={event} />
        </div>
        {event.decklists && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text"
          >
            {expanded ? "Hide decklist" : "View decklist"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-2 rounded-md border border-ctp-surface1 p-3">
          {loading && <p className="text-sm text-ctp-subtext1">Loading…</p>}
          {error && <p className="text-sm text-ctp-subtext0">{error}</p>}
          {decklist && (
            <>
              {(topDecks.bestOverall || topDecks.bestArchetype) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {topDecks.bestOverall && (
                    <Link
                      to={`/compare?add=${deckId},${topDecks.bestOverall.eventId}:${topDecks.bestOverall.player}`}
                      className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                    >
                      Compare with best {championName} deck &rarr;
                    </Link>
                  )}
                  {topDecks.bestArchetype && (
                    <Link
                      to={`/compare?add=${deckId},${topDecks.bestArchetype.eventId}:${topDecks.bestArchetype.player}`}
                      className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                    >
                      Compare with top {topDecks.bestArchetype.clusterName} build &rarr;
                    </Link>
                  )}
                </div>
              )}
              <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={deckId} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
