import { useState } from "react";
import { Link } from "react-router-dom";
import type { DeckHipsterScore } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { useSightingDecklist } from "../topdecks/useSightingDecklist";

export default function UniqueDeckRow({ score, playerName }: { score: DeckHipsterScore; playerName: string }) {
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error } = useSightingDecklist(score.eventId, score.player, expanded);
  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);

  return (
    <div className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <PlayerLink id={score.player} username={playerName} className="text-ctp-text hover:text-ctp-blue" />{" "}
          <span className="text-ctp-subtext0">at</span>{" "}
          <Link to={`/events/${score.eventId}`} className="text-ctp-blue hover:underline">
            {score.eventName}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-ctp-subtext0">{(score.score * 100).toFixed(0)} novelty</span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
          >
            {expanded ? "Hide" : "Decklist"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 border-t border-ctp-surface0 pt-2">
          {loading && <p className="text-sm text-ctp-subtext1">Loading…</p>}
          {error && <p className="text-sm text-ctp-subtext0">{error}</p>}
          {decklist && <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={`${score.eventId}:${score.player}`} />}
        </div>
      )}
    </div>
  );
}
