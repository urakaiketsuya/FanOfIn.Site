import { Link } from "react-router-dom";
import type { DeckSighting } from "@gatcg/shared";
import PlayerLink from "../features/players/PlayerLink";

/** `onToggleSelect`/`isSelected` are optional — pass both to show a checkbox per row (e.g. for building a Compare set); omit for the plain read-only list every other caller uses. */
export default function TopDecksList({
  decks,
  playerName,
  onToggleSelect,
  isSelected,
}: {
  decks: DeckSighting[];
  playerName: (id: number) => string;
  onToggleSelect?: (deck: DeckSighting) => void;
  isSelected?: (deck: DeckSighting) => boolean;
}) {
  return (
    <div className="space-y-1 text-sm">
      {decks.map((s) => (
        <div key={s.deckId} className="flex items-center justify-between gap-2 text-ctp-subtext1">
          <div className="flex min-w-0 items-center gap-2">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected?.(s) ?? false}
                onChange={() => onToggleSelect(s)}
                className="shrink-0"
                aria-label={`Select ${playerName(s.player)}'s deck at ${s.eventName}`}
              />
            )}
            <div className="min-w-0 truncate">
              <PlayerLink id={s.player} username={playerName(s.player)} className="text-ctp-text hover:text-ctp-blue" />{" "}
              <span className="text-ctp-subtext0">at</span>{" "}
              <Link to={`/events/${s.eventId}`} className="text-ctp-blue hover:underline">
                {s.eventName}
              </Link>
              {s.underplaced && (
                <span
                  className="ml-1.5 shrink-0 rounded-full border border-ctp-peach px-1.5 text-[10px] text-ctp-peach"
                  title="Strong match record, but still finished outside the top 30% of the field — likely tiebreakers, not a bad build."
                >
                  Tough finish
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 pl-2">
            #{s.placement} · {s.wins}-{s.losses}-{s.ties}
          </div>
        </div>
      ))}
    </div>
  );
}
