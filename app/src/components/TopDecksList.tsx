import { Link } from "react-router-dom";
import PlayerLink from "../features/players/PlayerLink";

/**
 * Only the fields this list actually renders — a `Pick` of `DeckSighting` would also work, but
 * every caller now sources these from the lean deck-popularity index (see
 * `useDeckPopularityIndexData`) joined with an event-name lookup, not the full 40MB+ dataset, so
 * the type stands on its own instead of implying a `DeckSighting` dependency that no longer exists.
 */
export interface TopDecksListEntry {
  deckId: string;
  player: number;
  eventId: number;
  eventName: string;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
  underplaced: boolean;
  eventDate?: string;
  deckHash?: string | null;
}

function formatEventDate(value: string | undefined): string | null {
  if (!value) return null;
  // Date-only values are parsed as UTC by JavaScript, which can display as the previous day in
  // western time zones. Full timestamps from the current popularity index should be parsed as-is.
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
}

/** `onToggleSelect`/`isSelected` are optional — pass both to show a checkbox per row (e.g. for building a Compare set); omit for the plain read-only list every other caller uses. */
export default function TopDecksList({
  decks,
  playerName,
  onToggleSelect,
  isSelected,
}: {
  decks: TopDecksListEntry[];
  playerName: (id: number) => string;
  onToggleSelect?: (deck: TopDecksListEntry) => void;
  isSelected?: (deck: TopDecksListEntry) => boolean;
}) {
  return (
    <div data-component="TopDecksList" className="space-y-1 text-sm">
      {decks.map((s) => {
        const eventDate = formatEventDate(s.eventDate);
        return <div key={s.deckId} className="flex items-center justify-between gap-2 text-ctp-subtext1">
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
            {/* wins/losses/ties can briefly be absent from a cached deck-popularity-index.json
                fetched before the next scheduled data-refresh run publishes them (see the field's
                addition in DeckPopularityEntry) — falls back to placement-only rather than
                rendering "undefined-undefined-undefined" during that window. */}
            {eventDate && <span className="mr-2 text-xs text-ctp-subtext0">{eventDate}</span>}
            {s.deckHash ? (
              <Link to={`/decks/${s.deckHash}`} className="text-ctp-blue hover:underline">
                {s.placement !== null ? `#${s.placement}` : "View deck"}
              </Link>
            ) : (
              s.placement !== null ? `#${s.placement}` : "—"
            )}
            {typeof s.wins === "number" && ` · ${s.wins}-${s.losses}-${s.ties}`}
          </div>
        </div>;
      })}
    </div>
  );
}
