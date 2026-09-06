import { useMemo } from "react";
import { useDeckPopularityIndexData } from "../topdecks/data";

/** This one decklist instance's own match record (`DeckPopularityEntry`, keyed by deckId) — not a
 * shrunk or champion-wide average, just the real W-L-T from the event it was played at. Renders
 * nothing for a deckId with no sighting (e.g. a pasted or purely personal decklist never entered
 * in a tracked tournament). Reads `deck-popularity-index.json`, the lean projection of
 * deck-sightings.json, so this is safe to mount on a decklist row without paying the full
 * multi-megabyte sightings fetch just to look up one deck's record. */
export default function DecklistWinRate({ deckId }: { deckId: string }) {
  const data = useDeckPopularityIndexData();
  const entry = useMemo(() => data?.entries.find((candidate) => candidate.deckId === deckId), [data, deckId]);

  if (!entry) return null;

  const record = `${entry.wins}-${entry.losses}${entry.ties > 0 ? `-${entry.ties}` : ""}`;
  return (
    <p data-component="DecklistWinRate" className="text-sm text-ctp-subtext1">
      <span className="font-semibold text-ctp-text">{(entry.winRate * 100).toFixed(0)}% win rate</span>{" "}
      ({record}) at this event — this decklist's own record, not a champion-wide average.
    </p>
  );
}
