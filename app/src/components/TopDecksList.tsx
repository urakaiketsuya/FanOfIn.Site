import { Link } from "react-router-dom";
import PlayerLink from "../features/players/PlayerLink";
import type { TopDecksListEntry } from "../features/topdecks/topDecksListEntry";
export type { TopDecksListEntry } from "../features/topdecks/topDecksListEntry";

/**
 * Only the fields this list actually renders — a `Pick` of `DeckSighting` would also work, but
 * every caller now sources these from the lean deck-popularity index (see
 * `useDeckPopularityIndexData`) joined with an event-name lookup, not the full 40MB+ dataset, so
 * the type stands on its own instead of implying a `DeckSighting` dependency that no longer exists.
 */
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
        return <div key={s.deckId} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 py-1 text-ctp-subtext1 transition-colors duration-200 hover:bg-ctp-surface0/70">
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
            <div className="min-w-0">
              <div className="truncate"><PlayerLink id={s.player} username={playerName(s.player)} className="text-ctp-text hover:text-ctp-blue" />{" "}<span className="text-ctp-subtext0">at</span>{" "}<Link to={`/events/${s.eventId}`} className="text-ctp-blue hover:underline">{s.eventName}</Link></div>
              {s.underplaced && (
                <span
                  className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ctp-peach/10 text-xs text-ctp-peach"
                  title="Strong match record, but still finished outside the top 30% of the field — likely tiebreakers, not a bad build."
                  aria-label="Tough finish"
                >
                  !
                </span>
              )}
              {s.cardSections && <div className="mt-1 flex flex-wrap gap-1">{s.cardSections.map((section) => <span key={section} className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${section === "sideboard" ? "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow" : section === "material" ? "border-ctp-mauve/50 bg-ctp-mauve/10 text-ctp-mauve" : "border-ctp-blue/40 bg-ctp-blue/10 text-ctp-blue"}`}>{section === "sideboard" ? "Sideboard" : section === "material" ? "Material" : "Main"}</span>)}</div>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-2">
            {/* wins/losses/ties can briefly be absent from a cached deck-popularity-index.json
                fetched before the next scheduled data-refresh run publishes them (see the field's
                addition in DeckPopularityEntry) — falls back to placement-only rather than
                rendering "undefined-undefined-undefined" during that window. */}
            <span className="hidden text-right text-xs text-ctp-subtext0 sm:inline">{eventDate && <span>{eventDate} · </span>}{s.placement !== null ? `#${s.placement}` : "No placement"}{typeof s.wins === "number" && ` · ${s.wins}-${s.losses}-${s.ties}`}</span>
            {s.deckHash ? <Link to={`/decks/${s.deckHash}`} className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue px-3 text-xs font-semibold text-ctp-base shadow-sm transition-colors hover:bg-ctp-sapphire focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue" aria-label={`Open ${playerName(s.player)}'s deck list`}>Open deck</Link> : <span className="text-xs text-ctp-subtext0">{s.placement !== null ? `#${s.placement}` : "—"}{typeof s.wins === "number" && ` · ${s.wins}-${s.losses}-${s.ties}`}</span>}
          </div>
        </div>;
      })}
    </div>
  );
}
