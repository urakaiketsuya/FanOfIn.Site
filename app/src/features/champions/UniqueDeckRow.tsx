import { useState } from "react";
import { Link } from "react-router-dom";
import type { DeckHipsterScore } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";
import DecklistView from "../events/DecklistView";
import { useCardsByNames } from "../events/useCardsByNames";
import { useSightingDecklist } from "../topdecks/useSightingDecklist";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

export default function UniqueDeckRow({ score, playerName }: { score: DeckHipsterScore; playerName: string }) {
  const [expanded, setExpanded] = useState(false);
  const { loading, decklist, error } = useSightingDecklist(score.eventId, score.player, expanded);
  const allNames = decklist ? [...decklist.main, ...decklist.material, ...decklist.sideboard].map((l) => l.card) : [];
  const cardsByName = useCardsByNames(allNames);

  return (
    <div data-component="UniqueDeckRow" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
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
          <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "Decklist"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 border-t border-ctp-surface0 pt-2">
          {loading && <InlineState className="text-sm">Loading…</InlineState>}
          {error && <p className="text-sm text-ctp-subtext0">{error}</p>}
          {decklist && <DecklistView decklist={decklist} cardsByName={cardsByName} deckId={`${score.eventId}:${score.player}`} showThumbnails />}
        </div>
      )}
    </div>
  );
}
