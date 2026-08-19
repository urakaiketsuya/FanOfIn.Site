import { useState } from "react";
import type { OmnidexEventSummary } from "@gatcg/shared";
import EventRow from "../tournaments/EventRow";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { usePlayerDecklist } from "./usePlayerDecklist";

export default function PlayerEventDecklistRow({ event, playerId }: { event: OmnidexEventSummary; playerId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error } = usePlayerDecklist(event.id, playerId, expanded);

  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);

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
          {decklist && <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={`${event.id}:${playerId}`} />}
        </div>
      )}
    </div>
  );
}
